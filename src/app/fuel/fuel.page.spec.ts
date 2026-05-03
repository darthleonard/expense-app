import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FuelPage } from './fuel.page';

describe('FuelPage', () => {
  let component: FuelPage;
  let fixture: ComponentFixture<FuelPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FuelPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
