export const MEDICAL_DISCLAIMER =
  "Arise is not a medical device. Stop if you feel pain, chest pressure, or faintness. Consult a qualified clinician before starting an exercise program.";

type MedicalDisclaimerProps = {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
};

export function MedicalDisclaimer({
  checked,
  onChange,
  disabled,
}: MedicalDisclaimerProps) {
  if (onChange) {
    return (
      <label className="disclaimer">
        <input
          type="checkbox"
          checked={checked === true}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          required
        />
        <span>
          <strong>Medical notice.</strong> {MEDICAL_DISCLAIMER} I understand and
          accept this notice.
        </span>
      </label>
    );
  }

  return (
    <p className="footer-note" role="note">
      <strong>Medical notice.</strong> {MEDICAL_DISCLAIMER}
    </p>
  );
}
