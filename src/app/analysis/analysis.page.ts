import { Component, OnInit } from '@angular/core';
import { AnalysisService, Insight } from '../core/services/analysis.service';

@Component({
  selector: 'app-analysis',
  templateUrl: './analysis.page.html',
  styleUrls: ['./analysis.page.scss'],
  standalone: false
})
export class AnalysisPage implements OnInit {
  insights: Insight[] = [];
  isLoading = true;
  selectedCategory: 'all' | 'house' | 'vehicle' = 'all';

  constructor(private analysis: AnalysisService) { }

  ngOnInit() {
  }

  async ionViewWillEnter() {
    this.isLoading = true;
    setTimeout(async () => {
      this.insights = await this.analysis.generateInsights();
      this.isLoading = false;
    }, 1200);
  }

  filteredInsights(): Insight[] {
    if (this.selectedCategory === 'all') {
      return this.insights;
    }
    return this.insights.filter(insight => insight.category === this.selectedCategory);
  }

  onCategoryChange(event: any) {
    this.selectedCategory = event.detail.value;
  }

  getIconForType(type: string) {
    if (type === 'success') return 'checkmark-circle';
    if (type === 'warning') return 'warning';
    return 'information-circle';
  }

  getColorForType(type: string) {
    if (type === 'success') return 'success';
    if (type === 'warning') return 'warning';
    return 'primary';
  }
}
