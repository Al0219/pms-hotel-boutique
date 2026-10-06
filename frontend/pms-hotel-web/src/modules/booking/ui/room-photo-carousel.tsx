'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './public-room-detail.module.css';

export function RoomPhotoCarousel({ images, name, illustrative }: { images: string[]; name: string; illustrative: boolean }) {
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const photos = [...new Set(images)];
  const index = active < photos.length ? active : 0;
  const move = (step: number) => setActive((index + step + photos.length) % photos.length);
  return <section className={styles.gallery} aria-label={`Fotografías de ${name}`}>
    <div className={styles.heroPhoto} tabIndex={photos.length > 1 ? 0 : undefined} onKeyDown={event => {
      if (photos.length > 1 && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); }
    }}>
      {photos.map((photo, i) => <div key={photo} className={`${styles.slide} ${i === index ? styles.activeSlide : ''}`} aria-hidden={i !== index}>
        {failed.includes(photo) ? <div className={styles.photoFallback}>Fotografía no disponible</div> :
          <Image src={photo} alt={`${name} · vista ${i + 1}${illustrative ? ' (ilustrativa)' : ''}`} fill sizes="(max-width: 900px) 100vw, 65vw" onError={() => setFailed(value => [...value, photo])} />}
      </div>)}
      {!photos.length && <div className={styles.photoFallback}>Fotografías próximamente</div>}
      {photos.length > 1 && <><button type="button" className={`${styles.photoArrow} ${styles.previous}`} aria-label="Fotografía anterior" onClick={() => move(-1)}>←</button>
        <button type="button" className={`${styles.photoArrow} ${styles.next}`} aria-label="Fotografía siguiente" onClick={() => move(1)}>→</button></>}
      {photos.length > 0 && <span className={styles.photoCounter} aria-live="polite">{index + 1} / {photos.length}</span>}
    </div>
    {photos.length > 1 && <div className={styles.thumbnails} aria-label="Elegir fotografía">{photos.map((photo, i) =>
      <button key={photo} type="button" aria-label={`Ver fotografía ${i + 1}`} aria-pressed={i === index} onClick={() => setActive(i)}>
        {failed.includes(photo) ? <span>Vista {i + 1}</span> : <Image src={photo} alt="" fill sizes="160px" onError={() => setFailed(value => [...value, photo])} />}
      </button>)}</div>}
    {illustrative && <p className={styles.small}>Imágenes ilustrativas de la habitación.</p>}
  </section>;
}
