import {render} from '@testing-library/react';
import {expect,it} from 'vitest';
import {staffNavigation} from './staff-navigation';
import {SvgIcon} from '@/shared/components/svg-icon';
it('uses the shared icon renderer with Android-equivalent menu metaphors and decorative SVG semantics',()=>{
 for(const [href,icon] of [['/dashboard','home'],['/housekeeping','cleaning'],['/room-service','dining'],['/amenities','gift'],['/reportes','reports']])expect(staffNavigation.find(entry=>entry.href===href)?.icon).toBe(icon);
 const ui=render(<SvgIcon name="gift"/>);expect(ui.container.querySelector('svg')).toHaveAttribute('aria-hidden','true');expect(ui.container.querySelector('svg path')).toBeTruthy();
});
