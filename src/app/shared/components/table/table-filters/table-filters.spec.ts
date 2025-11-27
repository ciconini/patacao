import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableFilters } from './table-filters';

describe('TableFilters', () => {
  let component: TableFilters;
  let fixture: ComponentFixture<TableFilters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableFilters]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableFilters);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
