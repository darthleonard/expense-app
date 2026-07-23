import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IndividualExpensesPage } from './individual-expenses.page';

describe('IndividualExpensesPage', () => {
  let component: IndividualExpensesPage;
  let fixture: ComponentFixture<IndividualExpensesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(IndividualExpensesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
