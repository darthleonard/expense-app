import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';

export interface Insight {
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info';
  params?: { [key: string]: any };
  icon?: string;
  entityName?: string;
  category: 'house' | 'vehicle' | 'general';
  metrics?: { label: string; value: string | number }[];
}

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  constructor(private db: DatabaseService) {}

  async generateInsights(): Promise<Insight[]> {
    const insights: Insight[] = [];

    // --- HOUSES ANALYSIS ---
    const houses = await this.db.houses.toArray();
    const expenses = await this.db.expenses.toArray();

    if (houses.length === 0) {
      insights.push({
        title: 'HOUSES',
        description: 'REGISTER_HOUSE_PROMPT',
        type: 'info',
        category: 'house',
        icon: 'home'
      });
    } else {
      for (const house of houses) {
        const houseExpenses = expenses.filter(e => e.houseId === house.id);
        const houseIcon = house.icon || 'home';

        if (houseExpenses.length === 0) {
          insights.push({
            title: 'NO_HOUSING_DATA_TITLE',
            description: 'NO_EXPENSES_RECORDED_YET',
            params: { name: house.name },
            type: 'info',
            category: 'house',
            icon: houseIcon,
            entityName: house.name
          });
          continue;
        }

        // Calculate house expense vs others
        let casa = 0;
        let others = 0;
        const monthsSet = new Set<string>();

        houseExpenses.forEach(e => {
          if (e.date) {
            monthsSet.add(e.date.substring(0, 7)); // "YYYY-MM"
          }
          if (e.type === 'housing') {
            casa += e.amount;
          } else {
            others += e.amount;
          }
        });

        const numMonths = monthsSet.size || 1;
        const avgCasa = casa / numMonths;
        const avgOthers = others / numMonths;
        const totalAvg = avgCasa + avgOthers;

        const metrics = [
          { label: 'HOUSING_RENT_MORTGAGE', value: `$${avgCasa.toFixed(2)}` },
          { label: 'UTILITIES', value: `$${avgOthers.toFixed(2)}` },
          { label: 'TOTAL_AVERAGE', value: `$${totalAvg.toFixed(2)}` }
        ];

        if (casa > 0 && others > casa) {
          insights.push({
            title: 'HIGH_UTILITY_EXPENSES_TITLE',
            description: 'HIGH_UTILITY_EXPENSES_DESC',
            params: { name: house.name },
            type: 'warning',
            category: 'house',
            icon: houseIcon,
            entityName: house.name,
            metrics
          });
        } else if (casa > 0) {
          insights.push({
            title: 'GOOD_BALANCE_TITLE',
            description: 'GOOD_BALANCE_DESC',
            params: { name: house.name },
            type: 'success',
            category: 'house',
            icon: houseIcon,
            entityName: house.name,
            metrics
          });
        } else {
          insights.push({
            title: 'NO_HOUSING_DATA_TITLE',
            description: 'NO_HOUSING_DATA_DESC',
            params: { name: house.name },
            type: 'info',
            category: 'house',
            icon: houseIcon,
            entityName: house.name,
            metrics
          });
        }
      }
    }

    // --- VEHICLES ANALYSIS ---
    const cars = await this.db.cars.toArray();
    const fuelRecords = await this.db.fuelRecords.toArray();

    if (cars.length === 0) {
      insights.push({
        title: 'VEHICLES',
        description: 'REGISTER_VEHICLE_PROMPT',
        type: 'info',
        category: 'vehicle',
        icon: 'car'
      });
    } else {
      for (const car of cars) {
        const carFuel = fuelRecords
          .filter(f => f.carId === car.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // newest first

        const carIcon = car.icon || 'car';

        if (carFuel.length < 2) {
          const hasOne = carFuel.length === 1;
          const metrics = hasOne ? [
            { label: 'TOTAL_COST', value: `$${carFuel[0].totalPrice.toFixed(2)}` },
            { label: 'VOLUME', value: `${carFuel[0].liters.toFixed(1)} L` }
          ] : [];

          insights.push({
            title: 'FUEL_PREDICTION_TITLE',
            description: 'FUEL_PREDICTION_DESC_2',
            params: { name: car.name },
            type: 'info',
            category: 'vehicle',
            icon: carIcon,
            entityName: car.name,
            metrics
          });
        } else {
          // Calculate predictions and metrics
          let totalDays = 0;
          let totalDistance = 0;
          let totalLiters = 0;
          let totalCost = 0;

          for (let i = 0; i < carFuel.length - 1; i++) {
            const d1 = new Date(carFuel[i].date).getTime();
            const d2 = new Date(carFuel[i + 1].date).getTime();
            const diffMs = d1 - d2;
            totalDays += diffMs / (1000 * 60 * 60 * 24);

            const dist = carFuel[i].odometer - carFuel[i + 1].odometer;
            if (dist > 0) {
              totalDistance += dist;
            }
            totalLiters += carFuel[i].liters;
            totalCost += carFuel[i].totalPrice;
          }

          // Count the last refill's metrics for average calculations
          totalLiters += carFuel[carFuel.length - 1].liters;
          totalCost += carFuel[carFuel.length - 1].totalPrice;

          const avgDays = totalDays / (carFuel.length - 1);
          const avgLiters = totalLiters / carFuel.length;
          const avgCost = totalCost / carFuel.length;
          const avgDistance = totalDistance > 0 ? (totalDistance / (carFuel.length - 1)) : 0;
          const efficiency = totalDistance > 0 ? (totalDistance / (totalLiters - carFuel[carFuel.length - 1].liters)) : 0; // standard distance per liter traveled

          const lastVisit = new Date(carFuel[0].date);
          const nextVisit = new Date(lastVisit.getTime() + avgDays * (1000 * 60 * 60 * 24));

          const metrics = [
            { label: 'ODOMETER', value: `${carFuel[0].odometer} km` },
            { label: 'AVERAGE_DAYS', value: `${Math.round(avgDays)}` },
            { label: 'AVERAGE_COST', value: `$${avgCost.toFixed(2)}` },
            { label: 'AVERAGE_VOLUME', value: `${avgLiters.toFixed(1)} L` }
          ];

          if (efficiency > 0) {
            metrics.push({ label: 'FUEL_EFFICIENCY', value: `${efficiency.toFixed(2)} km/L` });
          }

          insights.push({
            title: 'FUEL_PREDICTION_TITLE',
            description: 'FUEL_PREDICTION_DESC_1',
            params: {
              name: car.name,
              date: nextVisit.toLocaleDateString(),
              days: Math.round(avgDays)
            },
            type: 'info',
            category: 'vehicle',
            icon: carIcon,
            entityName: car.name,
            metrics
          });
        }
      }
    }

    return insights;
  }
}
