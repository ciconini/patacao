/**
 * AppointmentPricingDomainService
 *
 * Domain service responsible for calculating appointment pricing.
 * This service handles price calculations for appointments based on service lines,
 * respecting price overrides and summing multiple service lines.
 *
 * Responsibilities:
 * - Calculate appointment total from service lines
 * - Respect price overrides on service lines
 * - Sum multiple service lines
 * - Provide detailed pricing breakdown
 *
 * Collaborating Entities:
 * - Appointment: The appointment being priced
 * - Service: Provides base prices for services
 * - AppointmentServiceLine: Contains service references, quantities, and price overrides
 *
 * Business Rules Enforced:
 * - BR: Price calculation for an Appointment sums lines using `price_override` when present, otherwise Service price.
 * - BR: Each service line total = quantity * effective_price (price_override if set, else Service price)
 * - BR: Appointment total = sum of all service line totals
 * - BR: No tax logic here (VAT belongs to Invoice entity)
 *
 * Invariants:
 * - Appointment must have at least one service line
 * - Each service line must reference a valid Service
 * - Service price must be non-negative
 * - Price override must be non-negative if provided
 * - Quantity must be positive
 *
 * Edge Cases:
 * - Appointment with no service lines (should return 0 or error)
 * - Service line with missing Service entity
 * - Service line with price override of 0
 * - Service line with quantity > 1
 * - Multiple service lines with different price overrides
 * - Service price changes after appointment creation (uses current Service price if no override)
 */

import { Appointment } from './appointment.entity';
import { Service } from './service.entity';
import { AppointmentServiceLine } from './appointment-service-line.entity';

export interface PricingBreakdown {
  lineItems: LineItemPricing[];
  subtotal: number;
}

export interface LineItemPricing {
  lineId: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  effectivePrice: number;
  hasPriceOverride: boolean;
  lineTotal: number;
}

export class AppointmentPricingDomainService {
  /**
   * Calculates the total price for an appointment.
   *
   * This method sums all service line totals, respecting price overrides.
   *
   * Business Rule: Price calculation sums lines using `price_override` when present, otherwise Service price.
   *
   * @param appointment - The appointment to calculate price for
   * @param serviceLines - List of service lines for the appointment
   * @param services - Map of service ID to Service entity (for looking up base prices)
   * @returns Total price for the appointment
   * @throws Error if appointment has no service lines
   * @throws Error if any service line references a missing service
   */
  calculateAppointmentTotal(
    appointment: Appointment,
    serviceLines: AppointmentServiceLine[],
    services: Map<string, Service>,
  ): number {
    this.validateAppointmentHasLines(appointment, serviceLines);

    const breakdown = this.calculatePricingBreakdown(appointment, serviceLines, services);
    return breakdown.subtotal;
  }

  /**
   * Calculates detailed pricing breakdown for an appointment.
   *
   * Returns both the total and per-line pricing details including:
   * - Service information
   * - Quantities
   * - Unit prices (base and effective)
   * - Price override indicators
   * - Line totals
   *
   * @param appointment - The appointment to calculate pricing for
   * @param serviceLines - List of service lines for the appointment
   * @param services - Map of service ID to Service entity
   * @returns Detailed pricing breakdown
   * @throws Error if appointment has no service lines
   * @throws Error if any service line references a missing service
   */
  calculatePricingBreakdown(
    appointment: Appointment,
    serviceLines: AppointmentServiceLine[],
    services: Map<string, Service>,
  ): PricingBreakdown {
    this.validateAppointmentHasLines(appointment, serviceLines);
    this.validateServiceLinesReferenceServices(serviceLines, services);

    const lineItems: LineItemPricing[] = [];
    let subtotal = 0;

    for (const line of serviceLines) {
      // Validate that line belongs to this appointment
      if (line.appointmentId !== appointment.id) {
        throw new Error(`Service line ${line.id} does not belong to appointment ${appointment.id}`);
      }

      // Get the service for this line
      const service = services.get(line.serviceId);
      if (!service) {
        throw new Error(`Service ${line.serviceId} referenced by line ${line.id} not found`);
      }

      // Calculate effective price (price_override if set, otherwise Service price)
      const effectivePrice = line.getEffectivePrice(service.price);
      const lineTotal = line.calculateLineTotal(service.price);

      lineItems.push({
        lineId: line.id,
        serviceId: service.id,
        serviceName: service.name,
        quantity: line.quantity,
        unitPrice: service.price,
        effectivePrice,
        hasPriceOverride: line.hasPriceOverride(),
        lineTotal,
      });

      subtotal += lineTotal;
    }

    return {
      lineItems,
      subtotal,
    };
  }

  /**
   * Calculates the total for a single service line.
   *
   * This is a convenience method that encapsulates the price calculation logic.
   *
   * @param line - The service line
   * @param service - The service entity
   * @returns Line total (quantity * effective price)
   * @throws Error if service is not provided
   */
  calculateLineTotal(line: AppointmentServiceLine, service: Service): number {
    if (!service) {
      throw new Error('Service entity is required to calculate line total');
    }

    return line.calculateLineTotal(service.price);
  }

  /**
   * Gets the effective price for a service line.
   *
   * Effective price is the price_override if set, otherwise the Service base price.
   *
   * @param line - The service line
   * @param service - The service entity
   * @returns Effective price per unit
   * @throws Error if service is not provided
   */
  getEffectivePrice(line: AppointmentServiceLine, service: Service): number {
    if (!service) {
      throw new Error('Service entity is required to get effective price');
    }

    return line.getEffectivePrice(service.price);
  }

  /**
   * Calculates the total price for multiple appointments (e.g., recurring appointments).
   *
   * This method sums the totals of all provided appointments.
   *
   * @param appointments - List of appointments
   * @param appointmentServiceLinesMap - Map of appointment ID to its service lines
   * @param services - Map of service ID to Service entity
   * @returns Total price across all appointments
   * @throws Error if any appointment has invalid pricing
   */
  calculateMultipleAppointmentsTotal(
    appointments: Appointment[],
    appointmentServiceLinesMap: Map<string, AppointmentServiceLine[]>,
    services: Map<string, Service>,
  ): number {
    let total = 0;

    for (const appointment of appointments) {
      const serviceLines = appointmentServiceLinesMap.get(appointment.id) || [];

      // Skip appointments with no lines (they contribute 0 to total)
      if (serviceLines.length === 0) {
        continue;
      }

      total += this.calculateAppointmentTotal(appointment, serviceLines, services);
    }

    return total;
  }

  /**
   * Calculates pricing breakdown for multiple appointments.
   *
   * Returns a map of appointment ID to its pricing breakdown.
   *
   * @param appointments - List of appointments
   * @param appointmentServiceLinesMap - Map of appointment ID to its service lines
   * @param services - Map of service ID to Service entity
   * @returns Map of appointment ID to pricing breakdown
   * @throws Error if any appointment has invalid pricing
   */
  calculateMultipleAppointmentsBreakdown(
    appointments: Appointment[],
    appointmentServiceLinesMap: Map<string, AppointmentServiceLine[]>,
    services: Map<string, Service>,
  ): Map<string, PricingBreakdown> {
    const breakdowns = new Map<string, PricingBreakdown>();

    for (const appointment of appointments) {
      const serviceLines = appointmentServiceLinesMap.get(appointment.id) || [];

      // Appointments with no lines have zero subtotal
      if (serviceLines.length === 0) {
        breakdowns.set(appointment.id, {
          lineItems: [],
          subtotal: 0,
        });
        continue;
      }

      const breakdown = this.calculatePricingBreakdown(appointment, serviceLines, services);
      breakdowns.set(appointment.id, breakdown);
    }

    return breakdowns;
  }

  /**
   * Checks if an appointment has any price overrides.
   *
   * @param serviceLines - List of service lines for the appointment
   * @returns True if any line has a price override
   */
  hasPriceOverrides(serviceLines: AppointmentServiceLine[]): boolean {
    return serviceLines.some((line) => line.hasPriceOverride());
  }

  /**
   * Gets the count of service lines with price overrides.
   *
   * @param serviceLines - List of service lines for the appointment
   * @returns Number of lines with price overrides
   */
  getPriceOverrideCount(serviceLines: AppointmentServiceLine[]): number {
    return serviceLines.filter((line) => line.hasPriceOverride()).length;
  }

  /**
   * Calculates the total discount (if any) from price overrides.
   *
   * This calculates the difference between base prices and effective prices.
   * Negative values indicate discounts, positive values indicate surcharges.
   *
   * @param serviceLines - List of service lines for the appointment
   * @param services - Map of service ID to Service entity
   * @returns Total discount/surcharge amount (negative = discount, positive = surcharge)
   * @throws Error if any service line references a missing service
   */
  calculateTotalPriceOverrideAmount(
    serviceLines: AppointmentServiceLine[],
    services: Map<string, Service>,
  ): number {
    this.validateServiceLinesReferenceServices(serviceLines, services);

    let totalOverride = 0;

    for (const line of serviceLines) {
      const service = services.get(line.serviceId);
      if (!service) {
        throw new Error(`Service ${line.serviceId} referenced by line ${line.id} not found`);
      }

      if (line.hasPriceOverride()) {
        const baseTotal = line.quantity * service.price;
        const effectiveTotal = line.calculateLineTotal(service.price);
        totalOverride += effectiveTotal - baseTotal;
      }
    }

    return totalOverride;
  }

  /**
   * Validates that an appointment has at least one service line.
   *
   * @param appointment - The appointment
   * @param serviceLines - List of service lines
   * @throws Error if appointment has no service lines
   */
  private validateAppointmentHasLines(
    appointment: Appointment,
    serviceLines: AppointmentServiceLine[],
  ): void {
    if (!serviceLines || serviceLines.length === 0) {
      throw new Error(`Appointment ${appointment.id} must have at least one service line`);
    }
  }

  /**
   * Validates that all service lines reference existing services.
   *
   * @param serviceLines - List of service lines
   * @param services - Map of service ID to Service entity
   * @throws Error if any service line references a missing service
   */
  private validateServiceLinesReferenceServices(
    serviceLines: AppointmentServiceLine[],
    services: Map<string, Service>,
  ): void {
    for (const line of serviceLines) {
      if (!services.has(line.serviceId)) {
        throw new Error(
          `Service ${line.serviceId} referenced by line ${line.id} not found in services map`,
        );
      }
    }
  }
}
