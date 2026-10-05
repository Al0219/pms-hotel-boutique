import styles from './public-booking-review.module.css';

export function BookingStepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  return <nav aria-label="Pasos de la reserva"><ol className={styles.stepper}>
    {['Revisa tu selección', 'Datos del huésped', 'Revisa y confirma', 'Pago y garantía'].map((label, index) => <li key={label}
      aria-current={index + 1 === step ? 'step' : undefined} className={index + 1 <= step ? styles.activeStep : undefined}>
      <span>{index + 1 < step ? '✓' : index + 1}</span><strong>{label}</strong>
    </li>)}
  </ol></nav>;
}
