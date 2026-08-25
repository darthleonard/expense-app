import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { DatabaseService, Car, House, ExpenseCategoryTag } from '../core/services/database.service';
import { CategoryService } from '../core/services/category.service';
import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from '../core/services/settings.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface SpendingItem {
  id?: string;
  amount: number;
  date: string;
  categoryId?: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit {
  @ViewChild('pieCanvas') private pieCanvas!: ElementRef;
  @ViewChild('lineCanvas') private lineCanvas!: ElementRef;
  @ViewChild('categoryCanvas') private categoryCanvas!: ElementRef;

  private pieChart: any;
  private lineChart: any;
  private categoryChart: any;

  vehicles: Car[] = [];
  houses: House[] = [];
  expenseCategories: ExpenseCategoryTag[] = [];
  categoryMap = new Map<string, ExpenseCategoryTag>();

  selectedCarId: string | 'all' = 'all';
  selectedHouseId: string | 'all' = 'all';
  pieTimeRange: string = 'all_data';
  lineTimeRange: string = 'last_6_months';
  categoryTimeRange: string = 'all_data';

  selectedCategoryFilters: string[] = [];
  hasCategorySpending: boolean = false;
  hasFilteredCategorySpending: boolean = false;

  constructor(
    private db: DatabaseService,
    private categoryService: CategoryService,
    private translate: TranslateService,
    private settings: SettingsService,
    private cdr: ChangeDetectorRef
  ) {
    this.translate.onLangChange.subscribe(() => {
      this.loadData();
    });
  }

  ngOnInit() {}

  async ionViewWillEnter() {
    await this.settings.init();
    this.vehicles = await this.db.cars.toArray();
    this.houses = await this.db.houses.toArray();
    this.expenseCategories = await this.categoryService.getCategories();
    this.categoryMap = await this.categoryService.getCategoryMap();

    // Load persisted dashboard filters
    const savedHouseId = await this.settings.getDashboardSelectedHouse();
    const savedCarId = await this.settings.getDashboardSelectedCar();
    this.pieTimeRange = await this.settings.getDashboardPieTimeRange();
    this.lineTimeRange = await this.settings.getDashboardLineTimeRange();
    this.categoryTimeRange = await this.settings.getDashboardCategoryTimeRange();

    // Validate if the selected house/car still exists in the database
    if (savedHouseId !== 'all' && this.houses.some(h => h.id === savedHouseId)) {
      this.selectedHouseId = savedHouseId;
    } else {
      this.selectedHouseId = 'all';
      await this.settings.setDashboardSelectedHouse('all');
    }

    if (savedCarId !== 'all' && this.vehicles.some(c => c.id === savedCarId)) {
      this.selectedCarId = savedCarId;
    } else {
      this.selectedCarId = 'all';
      await this.settings.setDashboardSelectedCar('all');
    }

    await this.loadData();
  }

  async onFilterChange() {
    await this.settings.setDashboardSelectedHouse(this.selectedHouseId);
    await this.settings.setDashboardSelectedCar(this.selectedCarId);
    await this.loadData();
  }

  async onCategoryFilterChange() {
    await this.renderCategoryChart();
  }

  async loadData() {
    this.expenseCategories = await this.categoryService.getCategories();
    this.categoryMap = await this.categoryService.getCategoryMap();

    let expenses = await this.db.expenses.toArray();
    let fuel = await this.db.fuelRecords.toArray();

    if (this.selectedHouseId !== 'all') {
      expenses = expenses.filter(e => e.houseId === this.selectedHouseId);
    }
    if (this.selectedCarId !== 'all') {
      fuel = fuel.filter(f => f.carId === this.selectedCarId);
    }

    // Sort fuel by date
    fuel.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let housing = 0, electricity = 0, water = 0, gas = 0, telecom = 0;
    const filteredExpenses = this.filterByTimeRange(expenses, this.pieTimeRange);
    filteredExpenses.forEach(e => {
      if (e.type === 'housing') housing += e.amount;
      else if (e.type === 'electricity') electricity += e.amount;
      else if (e.type === 'water') water += e.amount;
      else if (e.type === 'gas_bill') gas += e.amount;
      else if (e.type === 'telecom') telecom += e.amount;
    });

    const pieData = [housing, electricity, water, gas, telecom];
    const pieLabels = [
      this.translate.instant('HOUSING_RENT_MORTGAGE'),
      this.translate.instant('ELECTRICITY'),
      this.translate.instant('WATER'),
      this.translate.instant('GAS_BILL'),
      this.translate.instant('TELECOMMUNICATIONS')
    ];

    if (this.pieChart) {
      this.pieChart.destroy();
    }

    if (this.pieCanvas?.nativeElement) {
      this.pieChart = new Chart(this.pieCanvas.nativeElement, {
        type: 'pie',
        data: {
          labels: pieLabels,
          datasets: [{
            data: pieData,
            backgroundColor: ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#4bc0c0']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            title: {
              display: true,
              text: this.translate.instant('HOUSEHOLD_EXPENSES'),
              font: { size: 16 }
            }
          }
        }
      });
    }

    // Fuel line chart
    const fuelWithDiff = fuel.map((f, i) => {
      const diff = i === 0 ? 0 : f.odometer - fuel[i - 1].odometer;
      return { ...f, diff };
    });

    const recentFuel = this.filterByTimeRange(fuelWithDiff, this.lineTimeRange);

    const lineLabels = recentFuel.map(f => {
      const d = new Date(f.date);
      return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
    });
    
    const priceData = recentFuel.map(f => f.totalPrice);
    const litersData = recentFuel.map(f => f.liters);
    const diffData = recentFuel.map(f => f.diff);

    if (this.lineChart) {
      this.lineChart.destroy();
    }

    if (this.lineCanvas?.nativeElement) {
      this.lineChart = new Chart(this.lineCanvas.nativeElement, {
        type: 'line',
        data: {
          labels: lineLabels,
          datasets: [
            {
              label: this.translate.instant('TOTAL_COST') + ' ($)',
              data: priceData,
              borderColor: '#ff6384',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              fill: false,
              tension: 0.1,
              yAxisID: 'y'
            },
            {
              label: this.translate.instant('VOLUME') + ' (L)',
              data: litersData,
              borderColor: '#36a2eb',
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              fill: false,
              tension: 0.1,
              yAxisID: 'y1'
            },
            {
              label: this.translate.instant('DISTANCE'),
              data: diffData,
              borderColor: '#cc65fe',
              backgroundColor: 'rgba(204, 101, 254, 0.2)',
              fill: false,
              tension: 0.1,
              yAxisID: 'y2'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            title: {
              display: true,
              text: this.translate.instant('FUEL_LOG'),
              font: { size: 16 }
            }
          },
          scales: {
            x: {
              display: true
            },
            y: {
              display: false,
              position: 'left'
            },
            y1: {
              display: false,
              position: 'right'
            },
            y2: {
              display: false,
              position: 'right'
            }
          }
        }
      });
    }

    // Spending by Category chart
    await this.renderCategoryChart();
  }

  async renderCategoryChart() {
    const individual = await this.db.individualExpenses.toArray();
    const purchases = await this.db.purchases.toArray();
    const purchaseItems = await this.db.purchaseItems.toArray();

    const purchaseMap = new Map(purchases.map(p => [p.id, p]));

    // 1. Gather all actual spending records
    const allSpending: SpendingItem[] = [];

    // Individual expenses
    for (const exp of individual) {
      if (exp.price > 0) {
        allSpending.push({
          id: exp.id,
          amount: exp.price,
          date: exp.date,
          categoryId: exp.categoryId
        });
      }
    }

    // Bought purchase items only
    const boughtItems = purchaseItems.filter(i => i.isBought && i.totalPrice > 0);
    for (const item of boughtItems) {
      const p = purchaseMap.get(item.purchaseId);
      const date = p?.purchaseDate || p?.creationDate || item.addedDate || new Date().toISOString();
      allSpending.push({
        id: item.id,
        amount: item.totalPrice,
        date,
        categoryId: item.categoryId
      });
    }

    // 2. Filter by date range
    const timeFiltered = this.filterByTimeRange(allSpending, this.categoryTimeRange);
    this.hasCategorySpending = timeFiltered.length > 0;

    // 3. Filter by selected categories (OR logic)
    let categoryFiltered: SpendingItem[] = [];
    if (this.selectedCategoryFilters.length === 0) {
      // No filter applied -> show all spending
      categoryFiltered = timeFiltered;
    } else {
      categoryFiltered = timeFiltered.filter(item => {
        const itemCatKey = (item.categoryId && this.categoryMap.has(item.categoryId))
          ? item.categoryId
          : 'uncategorized';
        return this.selectedCategoryFilters.includes(itemCatKey);
      });
    }

    this.hasFilteredCategorySpending = categoryFiltered.length > 0;
    this.cdr.detectChanges();

    if (this.categoryChart) {
      this.categoryChart.destroy();
      this.categoryChart = null;
    }

    if (!this.hasFilteredCategorySpending || !this.categoryCanvas?.nativeElement) {
      return;
    }

    // 4. Group spending by category
    const groupTotals = new Map<string, number>();
    for (const item of categoryFiltered) {
      const itemCatKey = (item.categoryId && this.categoryMap.has(item.categoryId))
        ? item.categoryId
        : 'uncategorized';
      groupTotals.set(itemCatKey, (groupTotals.get(itemCatKey) || 0) + item.amount);
    }

    const chartLabels: string[] = [];
    const chartData: number[] = [];
    const chartColors: string[] = [];

    // Sort categories: user categories first alphabetically, then uncategorized
    const sortedKeys = Array.from(groupTotals.keys()).sort((a, b) => {
      if (a === 'uncategorized') return 1;
      if (b === 'uncategorized') return -1;
      const nameA = this.categoryMap.get(a)?.name || '';
      const nameB = this.categoryMap.get(b)?.name || '';
      return nameA.localeCompare(nameB);
    });

    for (const key of sortedKeys) {
      const amount = groupTotals.get(key) || 0;
      if (key === 'uncategorized') {
        chartLabels.push(this.translate.instant('UNCATEGORIZED'));
        chartColors.push('#9e9e9e');
      } else {
        const tag = this.categoryMap.get(key);
        const name = tag ? tag.name.replace(/\b\w/g, c => c.toUpperCase()) : this.translate.instant('UNCATEGORIZED');
        chartLabels.push(name);
        chartColors.push(tag?.color || '#3880ff');
      }
      chartData.push(amount);
    }

    this.categoryChart = new Chart(this.categoryCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: chartLabels,
        datasets: [
          {
            data: chartData,
            backgroundColor: chartColors,
            hoverOffset: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 14,
              padding: 12
            }
          },
          title: {
            display: true,
            text: this.translate.instant('SPENDING_BY_CATEGORY'),
            font: { size: 16 }
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const label = context.label || '';
                const val = context.parsed || 0;
                const total = chartData.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                return ` ${label}: $${val.toFixed(2)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  filterByTimeRange(records: any[], timeRange: string): any[] {
    const now = new Date();
    if (timeRange === 'current_month') {
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return records.filter(r => new Date(r.date) >= startOfCurrentMonth);
    } else if (timeRange === 'last_3_months') {
      const startOfThreeMonthsAgo = new Date();
      startOfThreeMonthsAgo.setMonth(startOfThreeMonthsAgo.getMonth() - 3);
      return records.filter(r => new Date(r.date) >= startOfThreeMonthsAgo);
    } else if (timeRange === 'last_6_months') {
      const startOfSixMonthsAgo = new Date();
      startOfSixMonthsAgo.setMonth(startOfSixMonthsAgo.getMonth() - 6);
      return records.filter(r => new Date(r.date) >= startOfSixMonthsAgo);
    }
    return records; // 'all_data'
  }

  async setPieTimeRange(range: string) {
    this.pieTimeRange = range;
    await this.settings.setDashboardPieTimeRange(range);
    await this.loadData();
  }

  async setLineTimeRange(range: string) {
    this.lineTimeRange = range;
    await this.settings.setDashboardLineTimeRange(range);
    await this.loadData();
  }

  async setCategoryTimeRange(range: string) {
    this.categoryTimeRange = range;
    await this.settings.setDashboardCategoryTimeRange(range);
    await this.renderCategoryChart();
  }
}
