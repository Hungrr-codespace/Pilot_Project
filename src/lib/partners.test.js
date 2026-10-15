import { describe, expect, it } from 'vitest';
import {
  ageOn,
  birthProblem,
  fssaiProblem,
  formatLicence,
  formatVehicle,
  gstinCheckChar,
  gstinProblem,
  licenceProblem,
  validateApplication,
  vehicleProblem,
} from './partners';

describe('GSTIN', () => {
  it('accepts real GST numbers (their check character adds up)', () => {
    ['27AAPFU0939F1ZV', '29AAGCB7383J1Z4', '27AAACR5055K1Z7', '29AACCF0683K1ZD'].forEach((g) =>
      expect(gstinProblem(g)).toBe(''),
    );
    expect(gstinProblem(' 27aapfu0939f1zv ')).toBe('');
  });

  it('works out the check character', () => {
    expect(gstinCheckChar('27AAPFU0939F1Z')).toBe('V');
  });

  it('refuses typing mistakes, wrong shapes and state codes', () => {
    expect(gstinProblem('27AAPFU0939F1ZW')).toMatch(/doesn't add up/);
    expect(gstinProblem('27AAPFU0939F1Z')).toMatch(/15 characters/);
    expect(gstinProblem('27AAPF10939F1ZV')).toMatch(/PAN/);
    expect(gstinProblem('45AAPFU0939F1ZV')).toMatch(/state code/);
  });
});

describe('FSSAI, licence and vehicle numbers', () => {
  it('FSSAI has 14 digits (spaces ignored)', () => {
    expect(fssaiProblem('1042 5001 0001 23')).toBe('');
    expect(fssaiProblem('1042500100012')).toBeTruthy();
  });

  it('driving licence: state, RTO, year, 7 digits; not a future year', () => {
    const now = new Date('2026-10-14T12:00:00Z');
    expect(licenceProblem('BR01 20190012345', now)).toBe('');
    expect(licenceProblem('br-01-2019-0012345', now)).toBe('');
    expect(licenceProblem('BR01 2019001234', now)).toBeTruthy();
    expect(licenceProblem('BR01 20990012345', now)).toMatch(/future/);
    expect(formatLicence('br0120190012345')).toBe('BR01 20190012345');
  });

  it('vehicle: usual plates and the Bharat series', () => {
    expect(vehicleProblem('BR 01 AB 1234')).toBe('');
    expect(vehicleProblem('br01ab1234')).toBe('');
    expect(vehicleProblem('DL 1 C 23')).toBe('');
    expect(vehicleProblem('22 BH 1234 AA')).toBe('');
    expect(vehicleProblem('ABC')).toBeTruthy();
    expect(formatVehicle('br01ab1234')).toBe('BR 01 AB 1234');
    expect(formatVehicle('22bh1234aa')).toBe('22 BH 1234 AA');
  });
});

describe('rider age', () => {
  it('counts whole years, birthday included', () => {
    expect(ageOn('2008-10-14', '2026-10-14')).toBe(18);
    expect(ageOn('2008-10-15', '2026-10-14')).toBe(17);
    expect(ageOn('2005-02-30', '2026-10-14')).toBe(null);
  });

  it('riders are 18 or older', () => {
    expect(birthProblem('2008-10-14', '2026-10-14')).toBe('');
    expect(birthProblem('2008-10-15', '2026-10-14')).toMatch(/18 or older/);
    expect(birthProblem('', '2026-10-14')).toBeTruthy();
    expect(birthProblem('1930-01-01', '2026-10-14')).toMatch(/Check/);
  });
});

describe('validateApplication', () => {
  it('a restaurant without GST needs its name, address and FSSAI number', () => {
    const { values, errors } = validateApplication('restaurant', {
      restaurant_name: '  Momo   Point ',
      restaurant_address: ' Shop 4,  Main Road,\n Mesra ',
      no_gst: true,
      gstin: 'anything',
      fssai: '10425001000123',
    });
    expect(errors).toEqual({});
    expect(values).toEqual({
      restaurant_name: 'Momo Point',
      restaurant_address: 'Shop 4, Main Road, Mesra',
      no_gst: true,
      gstin: '',
      fssai: '10425001000123',
    });
  });

  it('a restaurant needs the address riders come to', () => {
    const { errors } = validateApplication('restaurant', {
      restaurant_name: 'Momo Point',
      restaurant_address: 'Mes',
      no_gst: true,
      fssai: '10425001000123',
    });
    expect(Object.keys(errors)).toEqual(['restaurant_address']);
  });

  it('reports each problem for a rider', () => {
    const { errors } = validateApplication(
      'rider',
      { dob: '2010-01-01', vehicle_no: 'X', dl_no: '123' },
      '2026-10-14',
    );
    expect(Object.keys(errors).sort()).toEqual(['dl_no', 'dob', 'vehicle_no']);
  });
});
