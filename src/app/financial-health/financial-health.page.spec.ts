import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinancialHealthPage } from './financial-health.page';

describe('FinancialHealthPage', () => {
  let component: FinancialHealthPage;
  let fixture: ComponentFixture<FinancialHealthPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FinancialHealthPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
