/**
 * Appointment Reminder Worker
 *
 * Background worker that sends appointment reminders to customers.
 * Runs periodically to check for upcoming appointments and send reminders.
 *
 * Features:
 * - Checks appointments scheduled in the next 24 hours
 * - Sends reminders via email/SMS (when email service is implemented)
 * - Respects customer consent preferences
 * - Logs reminder activity
 */

import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkerBase } from './worker-base';
import { AppointmentRepository } from '../modules/services/ports/appointment.repository.port';
import { CustomerRepository } from '../modules/administrative/ports/customer.repository.port';
import { PetRepository } from '../modules/administrative/ports/pet.repository.port';
import { ServiceRepository } from '../modules/services/ports/service.repository.port';
import { StoreRepository } from '../modules/administrative/ports/store.repository.port';
import { Logger } from '../shared/logger/logger.service';
import { Appointment } from '../modules/services/domain/appointment.entity';
import {
  AppointmentSearchCriteria,
  Pagination,
  Sort,
} from '../modules/services/ports/appointment.repository.port';

/**
 * Appointment reminder worker
 * Sends reminders for appointments scheduled in the next 24 hours
 */
@Injectable()
export class AppointmentReminderWorker extends WorkerBase {
  constructor(
    @Inject('AppointmentRepository')
    private readonly appointmentRepository: AppointmentRepository,
    @Inject('CustomerRepository')
    private readonly customerRepository: CustomerRepository,
    @Inject('PetRepository')
    private readonly petRepository: PetRepository,
    @Inject('ServiceRepository')
    private readonly serviceRepository: ServiceRepository,
    @Inject('StoreRepository')
    private readonly storeRepository: StoreRepository,
    @Inject('Logger')
    private readonly appLogger: Logger,
  ) {
    super('AppointmentReminderWorker');
  }

  /**
   * Runs every hour to check for upcoming appointments
   * Sends reminders for appointments in the next 24 hours
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    await this.run();
  }

  /**
   * Main execution logic
   */
  protected async execute(): Promise<void> {
    const now = new Date();
    const reminderWindowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 hours from now
    const reminderWindowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    this.logger.debug(
      `Checking for appointments between ${reminderWindowStart.toISOString()} and ${reminderWindowEnd.toISOString()}`,
    );

    // Find appointments in the reminder window
    const appointments = await this.findAppointmentsForReminder(
      reminderWindowStart,
      reminderWindowEnd,
    );

    if (appointments.length === 0) {
      this.logger.debug('No appointments found for reminder');
      return;
    }

    this.logger.log(`Found ${appointments.length} appointment(s) to send reminders for`);

    // Send reminders for each appointment
    for (const appointment of appointments) {
      try {
        await this.sendReminder(appointment);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Failed to send reminder for appointment ${appointment.id}: ${errorMessage}`,
          errorStack,
        );
        // Continue with other appointments
      }
    }
  }

  /**
   * Finds appointments that need reminders
   */
  private async findAppointmentsForReminder(
    startDate: Date,
    endDate: Date,
  ): Promise<Appointment[]> {
    // Query appointments scheduled between startDate and endDate
    // Status should be PENDING or CONFIRMED
    // TODO: Implement repository method for this query
    // For now, we'll use a placeholder that needs to be implemented in the repository

    // This is a placeholder - the actual implementation should use the repository
    // to query appointments with:
    // - startAt between startDate and endDate
    // - status in ['PENDING', 'CONFIRMED']
    // - reminderSent = false (if we add this field)

    this.logger.warn('findAppointmentsForReminder: Repository method not yet implemented');
    return [];
  }

  /**
   * Sends a reminder for a specific appointment
   */
  private async sendReminder(appointment: Appointment): Promise<void> {
    // Load related entities
    // Note: Appointment doesn't have a direct serviceId - services are linked via notes or other means
    // For now, we'll skip service lookup and just use generic service name
    const [customer, pet, store] = await Promise.all([
      this.customerRepository.findById(appointment.customerId),
      appointment.petId ? this.petRepository.findById(appointment.petId) : Promise.resolve(null),
      this.storeRepository.findById(appointment.storeId),
    ]);

    if (!customer || !store) {
      this.logger.warn(
        `Cannot send reminder for appointment ${appointment.id}: missing related entities`,
      );
      return;
    }

    // Check customer consent for reminders
    if (!customer.consentReminders) {
      this.logger.debug(
        `Skipping reminder for appointment ${appointment.id}: customer ${customer.id} has not consented to reminders`,
      );
      return;
    }

    // Prepare reminder message
    // Note: Service information is not directly available on Appointment entity
    const reminderMessage = this.prepareReminderMessage(appointment, customer, pet, store);

    // TODO: Send email/SMS when email service is implemented
    // For now, just log the reminder
    this.logger.log(`Reminder for appointment ${appointment.id}: ${reminderMessage}`);

    // Mark reminder as sent (if we add this field to Appointment entity)
    // await this.appointmentRepository.markReminderSent(appointment.id);
  }

  /**
   * Prepares the reminder message
   */
  private prepareReminderMessage(
    appointment: Appointment,
    customer: any, // Customer entity
    pet: any | null, // Pet entity
    store: any, // Store entity
  ): string {
    const petName = pet ? pet.name : 'your pet';
    const appointmentDate = new Date(appointment.startAt).toLocaleString('pt-PT', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    // Note: Service information is not directly available on Appointment entity
    // Using generic message for now
    return `Reminder: You have an appointment for ${petName} on ${appointmentDate} at ${store.name}.`;
  }
}
