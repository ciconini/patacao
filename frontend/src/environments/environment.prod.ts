import { FirebaseOptions } from '@angular/fire/app';

export const environment = {
  production: true,
  apiUrl: '/api', // Use relative URL in production or set your production API URL
  firebase: {
    apiKey: 'AIzaSyBUwtyFNqKwgST9U9K8BXfEZFDVQ1b5QP4',
    authDomain: 'patacao.firebaseapp.com',
    projectId: 'patacao',
    storageBucket: 'patacao.firebasestorage.app',
    messagingSenderId: '201123279804',
    appId: '1:201123279804:web:15eebca85062b166c0f1b9',
    measurementId: 'G-464VGGLCKG',
  } as FirebaseOptions,
};

