export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  devCode?: string;
  url?: string;
  details?: string;
  appointment?: {
    id: string;
    barber: string;
    service: string;
    dateText: string;
    endText: string;
    name: string;
    phone: string;
  };
};

export type DayAppointment = {
  id: string;
  start: string;
  end: string;
  startMin: number;
  endMin: number;
  customerName: string;
  customerPhone: string;
  status: string;
  type: string;
  source: string;
  note: string | null;
  serviceName: string | null;
  servicePrice: number | null;
  durationMin: number;
  barberId: string;
  barberName: string;
};
