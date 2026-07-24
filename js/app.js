/* ============================================================
   FUTSOL ARENA — shared data layer
   Everything runs client-side against localStorage so the whole
   flow (browse -> book -> WhatsApp -> admin approve) works with
   zero backend. Swap STORE.* functions for real API calls when
   you wire up Postgres/Prisma later — the rest of the UI won't
   need to change.
   ============================================================ */

const CONFIG = {
  whatsappNumber: "923117224159", // Futsol Arena admin WhatsApp number
  basePrice: 2000,
  weekendPrice: 2500,
  nightPrice: 3000, // 8 PM - 12 AM
  currency: "Rs.",
  openHour: 0,   // 12 AM
  closeHour: 24, // midnight, i.e. 24 one-hour slots
  sports: ["Football", "Cricket"]
};

const STORE = {
  KEY: "futsol_bookings_v1",

  all(){
    try{ return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch(e){ return []; }
  },
  save(list){
    localStorage.setItem(this.KEY, JSON.stringify(list));
  },
  add(booking){
    const list = this.all();
    booking.id = "BK" + Date.now().toString(36).toUpperCase();
    booking.createdAt = new Date().toISOString();
    list.push(booking);
    this.save(list);
    return booking;
  },
  update(id, patch){
    const list = this.all().map(b => b.id === id ? {...b, ...patch} : b);
    this.save(list);
  },
  remove(id){
    this.save(this.all().filter(b => b.id !== id));
  },
  forDate(sport, dateISO){
    return this.all().filter(b => b.sport === sport && b.date === dateISO && b.status !== "Rejected");
  }
};

/** Build the next 7 selectable dates starting today */
function getNext7Days(){
  const days = [];
  const today = new Date();
  for(let i=0;i<7;i++){
    const d = new Date(today);
    d.setDate(today.getDate()+i);
    days.push({
      iso: d.toISOString().slice(0,10),
      label: i===0 ? "Today" : i===1 ? "Tomorrow" : d.toLocaleDateString('en-US',{weekday:'short'}),
      dayNum: d.getDate(),
      month: d.toLocaleDateString('en-US',{month:'short'}),
      isWeekend: d.getDay()===0 || d.getDay()===6
    });
  }
  return days;
}

/** Price for a given hour + weekend flag */
function priceFor(hour, isWeekend){
  if(hour >= 20 || hour < 0) return CONFIG.nightPrice; // 8PM-12AM night rate
  if(isWeekend) return CONFIG.weekendPrice;
  return CONFIG.basePrice;
}

function fmtHour(h){
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${h12} ${ampm}`;
}

/** Find the existing booking (if any) that occupies a given hour, accounting for multi-hour bookings */
function bookingAtHour(existing, h){
  return existing.find(b => h >= b.hour && h < b.hour + (b.duration || 1));
}

/** Status for a single hour slot: available / booked / pending / past */
function statusForHour(existing, h, isToday, currentHour){
  const match = bookingAtHour(existing, h);
  if(match) return match.status === "Pending" ? "pending" : "booked";
  if(isToday && h <= currentHour) return "past";
  return "available";
}

/**
 * Generate the 24 possible start-hour slots for a sport+date, with status,
 * for a given booking duration (1 hour = Rs.2000, 2 hours = Rs.4000 at standard rate).
 */
function buildSlots(sport, dateISO, isWeekend, duration){
  duration = duration || 1;
  const existing = STORE.forDate(sport, dateISO);
  const now = new Date();
  const isToday = dateISO === now.toISOString().slice(0,10);
  const currentHour = now.getHours();

  const slots = [];
  for(let h=0; h<24; h++){
    const startLabel = fmtHour(h);
    const endLabel = fmtHour((h+duration)%24);

    let status = "available";
    let price = 0;
    let bookingId = null;

    if(h + duration > 24){
      // Not enough hours left in the day for this duration
      status = "past";
    } else {
      for(let i=0; i<duration; i++){
        const hourStatus = statusForHour(existing, h+i, isToday, currentHour);
        price += priceFor(h+i, isWeekend);
        if(hourStatus !== "available"){
          status = hourStatus;
          const match = bookingAtHour(existing, h+i);
          if(match) bookingId = match.id;
          break;
        }
      }
    }

    slots.push({
      hour:h,
      duration,
      time:`${startLabel} - ${endLabel}`,
      status,
      price,
      bookingId
    });
  }
  return slots;
}

function buildWhatsAppLink(booking){
  const durationLabel = (booking.duration || 1) === 2 ? "2 Hours" : "1 Hour";
  const text =
`Hello, I want to book a ground.

Name: ${booking.name}
Sport: ${booking.sport}
Date: ${booking.dateLabel}
Time: ${booking.time}
Duration: ${durationLabel}
Price: ${CONFIG.currency}${booking.price}

Please share payment details.`;
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
}
