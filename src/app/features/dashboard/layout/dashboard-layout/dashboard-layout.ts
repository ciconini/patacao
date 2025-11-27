import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Sidebar } from "app/features/dashboard/components/sidebar/sidebar";
import { Footer } from "../../components/footer/footer";
import { Topbar } from "../../components/topbar/topbar";

@Component({
  selector: 'app-dashboard-layout',
  imports: [Sidebar, RouterModule, Footer, Topbar],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.scss',
})
export class DashboardLayout {

}
