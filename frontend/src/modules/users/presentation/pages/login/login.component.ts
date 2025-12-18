/**
 * Login Component
 * 
 * Login page with form validation and error handling
 */

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../../../shared/services/toast.service';
import { FormFieldComponent } from '../../../../../shared/components/molecules/form-field/form-field.component';
import { ButtonComponent } from '../../../../../shared/components/atoms/button/button.component';
import { emailValidator } from '../../../../../shared/utils/validators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent, ButtonComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);

  loginForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, emailValidator()]],
      password: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toastService.success('Login realizado com sucesso!');
        
        // Redirect to return URL or dashboard
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigate([returnUrl]);
      },
      error: (error) => {
        this.isLoading.set(false);
        const message = error?.error?.message || error?.message || 'Erro ao fazer login. Verifique suas credenciais.';
        this.errorMessage.set(message);
        this.toastService.error(message);
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  emailError(): string | null {
    const emailControl = this.loginForm.get('email');
    if (emailControl?.hasError('required') && emailControl.touched) {
      return 'Email é obrigatório';
    }
    if (emailControl?.hasError('email') && emailControl.touched) {
      return 'Email inválido';
    }
    return null;
  }

  passwordError(): string | null {
    const passwordControl = this.loginForm.get('password');
    if (passwordControl?.hasError('required') && passwordControl.touched) {
      return 'Senha é obrigatória';
    }
    return null;
  }
}
