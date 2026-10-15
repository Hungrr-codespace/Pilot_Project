import { describe, expect, it } from 'vitest';
import { alertText, arrivals, mapsLink, pickupStage, shortOrderId } from './rider';

describe('mapsLink', () => {
  it('uses the saved map link when it is a web address', () => {
    expect(mapsLink({ address: 'Main Road', map_link: 'https://maps.app.goo.gl/abc' })).toBe(
      'https://maps.app.goo.gl/abc',
    );
  });

  it('otherwise searches for the address, near the campus', () => {
    expect(mapsLink({ address: 'Girls Hostel 2, Room 114' }, 'BIT Mesra, Patna')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Girls%20Hostel%202%2C%20Room%20114%2C%20BIT%20Mesra%2C%20Patna',
    );
    expect(mapsLink({ address: 'Gate 1, BIT Mesra, Patna' }, 'BIT Mesra, Patna')).toMatch(
      /Gate%201%2C%20BIT/,
    );
    expect(mapsLink({ address: 'Gate 1, BIT Mesra, Patna' }, 'BIT Mesra, Patna')).not.toMatch(/Patna.*Patna/);
  });

  it('nothing to link without an address or a real link', () => {
    expect(mapsLink({ address: '  ', map_link: 'maps.app.goo.gl/x' })).toBe('');
    expect(mapsLink()).toBe('');
  });
});

describe('pickupStage', () => {
  const stop = (ready) => ({ name: 'A', ready });
  it('says how far the kitchens are', () => {
    expect(pickupStage({ status: 'Paid', pickups: [stop(false)] }).text).toBe('Kitchen yet to start');
    expect(pickupStage({ status: 'Preparing', pickups: [stop(false)] }).text).toBe('Being prepared');
    expect(pickupStage({ status: 'Preparing', pickups: [stop(true), stop(false)] }).text).toBe(
      '1 of 2 ready',
    );
    expect(pickupStage({ status: 'Preparing', pickups: [stop(true), stop(true)] })).toEqual({
      text: 'Ready for pickup',
      tone: 'ready',
    });
  });
});

describe('new-order alerts', () => {
  const a = {
    order_id: 'HG-261014-K7Q2',
    drop: 'Girls Hostel 2',
    pickups: [{ name: 'Babai Tiffins' }, { name: 'Al Daaz' }],
  };
  const b = { order_id: 'HG-261014-M3PX', drop: 'Hostel 5', pickups: [{ name: 'Pizza Cafe' }] };

  it('nothing is new on the first check', () => {
    expect(arrivals(null, [a, b])).toEqual([]);
    expect(arrivals(new Set(['HG-261014-K7Q2']), [a, b])).toEqual([b]);
  });

  it('one new order: where from and where to', () => {
    expect(alertText([a])).toEqual({
      title: 'New order to deliver',
      body: 'Pick up: Babai Tiffins, Al Daaz · Drop: Girls Hostel 2',
      tag: 'hungrr-new-order',
    });
    expect(shortOrderId(a.order_id)).toBe('K7Q2');
  });

  it('several new orders, and orders the team assigned', () => {
    expect(alertText([a, b]).title).toBe('2 new orders to deliver');
    expect(alertText([a, b]).body).toBe('#K7Q2: Girls Hostel 2 · #M3PX: Hostel 5');
    const job = {
      order_id: 'HG-261014-R8TD',
      address: 'Hostel 5, Room 31',
      pickups: [{ name: 'Babai Tiffins' }],
    };
    expect(alertText([a], [job])).toEqual({
      title: 'Order #R8TD assigned to you',
      body: 'Pick up: Babai Tiffins · Drop: Hostel 5',
      tag: 'hungrr-assigned',
    });
  });
});
