import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnimalPage } from './customer-page';

describe('AnimalPage', () => {
  let component: AnimalPage;
  let fixture: ComponentFixture<AnimalPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimalPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnimalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
