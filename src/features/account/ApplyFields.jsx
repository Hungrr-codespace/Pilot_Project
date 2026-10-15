import { useId } from 'react';
import {
  cleanFssai,
  cleanGstin,
  cleanLicence,
  cleanVehicle,
  formatLicence,
  formatVehicle,
  indianToday,
  RIDER_MIN_AGE,
} from '@/lib/partners';
import { LineField } from './LineField';
import styles from './SignInDialog.module.css';

// The details a restaurant or a rider gives when applying (checked in lib/partners.js and again by the sheet).
// Restaurant: its name, its address (where riders pick up), GST number or "not registered for GST", FSSAI
// number. Rider: date of birth, vehicle
// number, driving licence number. `form` holds the values, `set(field, value)` changes one.
export function ApplyFields({ role, form, set, errors }) {
  if (role === 'restaurant') return <RestaurantFields form={form} set={set} errors={errors} />;
  return <RiderFields form={form} set={set} errors={errors} />;
}

function RestaurantFields({ form, set, errors }) {
  return (
    <>
      <LineField
        label="Restaurant name"
        name="restaurant_name"
        autoComplete="organization"
        placeholder="As your customers know it"
        maxLength={40}
        value={form.restaurant_name}
        error={errors.restaurant_name}
        onChange={(e) => set('restaurant_name', e.target.value)}
      />
      <LineField
        label="Restaurant address"
        name="restaurant_address"
        autoComplete="street-address"
        placeholder="e.g. Shop 4, Main Road, Mesra"
        maxLength={160}
        value={form.restaurant_address}
        error={errors.restaurant_address}
        hint={errors.restaurant_address ? '' : 'Where riders pick up your orders.'}
        onChange={(e) => set('restaurant_address', e.target.value)}
      />
      <div className={styles.fieldGroup}>
        <LineField
          label="GST number (GSTIN)"
          name="gstin"
          autoCapitalize="characters"
          spellCheck="false"
          placeholder={form.no_gst ? 'Not registered for GST' : '15 characters, e.g. 10ABCDE1234F1Z5'}
          maxLength={20}
          value={form.no_gst ? '' : form.gstin}
          disabled={form.no_gst}
          error={form.no_gst ? '' : errors.gstin}
          onChange={(e) => set('gstin', cleanGstin(e.target.value))}
        />
        <Tick
          checked={form.no_gst}
          onChange={(checked) => set('no_gst', checked)}
          label="We're not registered for GST"
          hint="Small kitchens below the GST turnover limit don't need it. FSSAI is still needed."
        />
      </div>
      <LineField
        label="FSSAI licence or registration number"
        name="fssai"
        inputMode="numeric"
        placeholder="14 digits, on your FSSAI certificate"
        maxLength={20}
        value={form.fssai}
        error={errors.fssai}
        onChange={(e) => set('fssai', cleanFssai(e.target.value))}
      />
    </>
  );
}

function RiderFields({ form, set, errors }) {
  // The latest birth date that is 18 today
  const today = indianToday();
  const latest = `${Number(today.slice(0, 4)) - RIDER_MIN_AGE}${today.slice(4)}`;
  return (
    <>
      <LineField
        label="Date of birth"
        name="dob"
        type="date"
        autoComplete="bday"
        max={latest}
        value={form.dob}
        error={errors.dob}
        hint={errors.dob ? '' : `Riders must be ${RIDER_MIN_AGE} or older.`}
        onChange={(e) => set('dob', e.target.value)}
      />
      <LineField
        label="Vehicle number"
        name="vehicle_no"
        autoCapitalize="characters"
        spellCheck="false"
        placeholder="As on the number plate, e.g. BR 01 AB 1234"
        maxLength={16}
        value={form.vehicle_no}
        error={errors.vehicle_no}
        onChange={(e) => set('vehicle_no', e.target.value.toUpperCase())}
        onBlur={() => set('vehicle_no', formatVehicle(cleanVehicle(form.vehicle_no)))}
      />
      <LineField
        label="Driving licence number"
        name="dl_no"
        autoCapitalize="characters"
        spellCheck="false"
        placeholder="e.g. BR01 20190012345"
        maxLength={20}
        value={form.dl_no}
        error={errors.dl_no}
        onChange={(e) => set('dl_no', e.target.value.toUpperCase())}
        onBlur={() => set('dl_no', formatLicence(cleanLicence(form.dl_no)))}
      />
    </>
  );
}

// A tick box drawn on the khata page
function Tick({ checked, onChange, label, hint }) {
  const id = useId();
  return (
    <div className={styles.tick}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={`${id}-hint`}
        className={styles.tickBox}
      />
      <label htmlFor={id} className={styles.tickLabel}>
        {label}
        <span id={`${id}-hint`} className={styles.tickHint}>
          {hint}
        </span>
      </label>
    </div>
  );
}
