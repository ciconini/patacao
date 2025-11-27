import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerDetailPage } from './customer-detail-page';

describe('CustomerDetailPage', () => {
  let component: CustomerDetailPage;
  let fixture: ComponentFixture<CustomerDetailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerDetailPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomerDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
