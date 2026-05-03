import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AllocationPage } from './allocation.page';

describe('AllocationPage', () => {
  let component: AllocationPage;
  let fixture: ComponentFixture<AllocationPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AllocationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
