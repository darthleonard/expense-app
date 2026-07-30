import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { DatabaseService, Car, House } from '../core/services/database.service';
import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from '../core/services/settings.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit {
  @ViewChild('pieCanvas') private pieCanvas!: ElementRef;
  @ViewChild('lineCanvas') private lineCanvas!: ElementRef;
  private pieChart: any;
  private lineChart: any;

  vehicles: Car[] = [];
  houses: House[] = [];
  selectedCarId: number | 'all' = 'all';
  selectedHouseId: number | 'all' = 'all';
  pieTimeRange: string = 'all_data';
  lineTimeRange: string = 'last_6_months';

  constructor(
    private db: DatabaseService,
    private translate: TranslateService,
    private settings: SettingsService
  ) {
    this.translate.onLangChange.subscribe(() => {
      this.loadData();
    });
  }

  ngOnInit() {
  }

  async ionViewWillEnter() {
    await this.settings.init();
    this.vehicles = await this.db.cars.toArray();
    this.houses = await this.db.houses.toArray();

    // Load persisted dashboard filters
    const savedHouseId = await this.settings.getDashboardSelectedHouse();
    const savedCarId = await this.settings.getDashboardSelectedCar();
    this.pieTimeRange = await this.settings.getDashboardPieTimeRange();
    this.lineTimeRange = await this.settings.getDashboardLineTimeRange();

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

  async loadData() {
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

    // Fuel line chart
    // Calculate diffs first to keep accuracy for the first item in the filtered view
    const fuelWithDiff = fuel.map((f, i) => {
      const diff = i === 0 ? 0 : f.odometer - fuel[i - 1].odometer;
      return { ...f, diff };
    });

    // Filter by selected line chart time range
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

    // Only render or update chart if there is data, or let it render empty gracefully
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
}
