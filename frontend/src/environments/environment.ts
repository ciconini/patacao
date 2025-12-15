// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { FirebaseOptions } from '@angular/fire/app';

export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
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

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

