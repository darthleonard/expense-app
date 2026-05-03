import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';

export interface Insight {
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  constructor(private db: DatabaseService) {}

  async generateInsights(): Promise<Insight[]> {
    const expenses = await this.db.expenses.toArray();
    const fuel = await this.db.fuelRecords.orderBy('date').reverse().toArray();
    const insights: Insight[] = [];

    let casa = 0, others = 0;
    expenses.forEach(e => {
      if (e.type === 'casa') casa += e.amount;
      else others += e.amount;
    });

    if (casa > 0 && others > casa) {
      insights.push({
        title: 'Gastos de servicios altos',
        description: 'Tus gastos de servicios y misceláneos superan el gasto de tu casa. Intenta optimizar tu consumo mensual.',
        type: 'warning'
      });
    } else if (casa > 0) {
      insights.push({
        title: 'Buen equilibrio',
        description: 'Tus gastos están en un rango razonable en comparación con el costo de vivienda.',
        type: 'success'
      });
    } else {
      insights.push({
        title: 'Sin datos de vivienda',
        description: 'Agrega gastos de vivienda (Casa) para un mejor análisis de tu presupuesto.',
        type: 'info'
      });
    }

    if (fuel.length >= 2) {
      let totalDays = 0;
      for (let i = 0; i < fuel.length - 1; i++) {
        const d1 = new Date(fuel[i].date).getTime();
        const d2 = new Date(fuel[i + 1].date).getTime();
        const diffMs = d1 - d2;
        totalDays += diffMs / (1000 * 60 * 60 * 24);
      }
      const avgDays = totalDays / (fuel.length - 1);
      const lastVisit = new Date(fuel[0].date);
      const nextVisit = new Date(lastVisit.getTime() + avgDays * (1000 * 60 * 60 * 24));
      
      insights.push({
        title: 'Predicción de Combustible',
        description: `Basado en tu historial, tu próxima visita a la gasolinera será alrededor del ${nextVisit.toLocaleDateString()}. \nPromedio de visitas: cada ${Math.round(avgDays)} días.`,
        type: 'info'
      });
    } else {
      insights.push({
        title: 'Predicción de Combustible',
        description: 'No hay suficientes datos de combustible para predecir tu próxima visita. Agrega al menos 2 registros.',
        type: 'info'
      });
    }

    return insights;
  }
}
