import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PetItem } from './pet-item';

describe('PetItem', () => {
  let component: PetItem;
  let fixture: ComponentFixture<PetItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PetItem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PetItem);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
