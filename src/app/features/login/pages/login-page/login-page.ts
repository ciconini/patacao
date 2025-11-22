import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPaw } from '@fortawesome/free-solid-svg-icons';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { environment } from 'environments/environment';
import { LoginForm } from "../../components/login-form/login-form";

@Component({
  selector: 'app-login-page',
  imports: [
    CardModule,
    FontAwesomeModule,
    LoginForm
],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  env = environment;
  faPaw = faPaw; // FontAwesome paw icon
  loginTextConfig = {
    title: 'Welcome Back!',
    subtitle: 'Please login to your account',
  };
}
