import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectionsPage } from './projections.page';

describe('ProjectionsPage', () => {
  let component: ProjectionsPage;
  let fixture: ComponentFixture<ProjectionsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectionsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
