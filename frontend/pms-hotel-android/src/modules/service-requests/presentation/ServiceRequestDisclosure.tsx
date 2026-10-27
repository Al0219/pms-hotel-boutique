import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { guestFeatureIcons } from '@/modules/navigation';
import { tokens } from '@/shared/theme/tokens';
import { sessionServiceRequestStyles as styles } from './sessionServiceRequestStyles';

interface DisclosureState {
  expandedId: string | null;
  toggle: (id: string) => void;
  summaryHeight: number;
  reportSummary: (id: string, height: number) => void;
  forgetSummary: (id: string) => void;
}
const DisclosureContext = createContext<DisclosureState | null>(null);
function DisclosureRoot({ children, scope }: { children: ReactNode; scope: string }) {
  const [selection, setSelection] = useState<{id:string;scope:string} | null>(null);
  const [heights, setHeights] = useState<Record<string,number>>({});
  const reportSummary = useCallback((id:string,height:number)=>setHeights(current=>current[id]===height?current:{...current,[id]:height}),[]);
  const forgetSummary = useCallback((id:string)=>setHeights(current=>{if(!(id in current))return current;const next={...current};delete next[id];return next;}),[]);
  const summaryHeight=Math.max(0,...Object.values(heights));
  const expandedId = selection?.scope === scope ? selection.id : null;
  const toggle = useCallback((id: string) => setSelection(current => current?.scope === scope && current.id === id ? null : {id,scope}), [scope]);
  const value = useMemo(() => ({ expandedId, toggle, summaryHeight, reportSummary, forgetSummary }), [expandedId, toggle, summaryHeight, reportSummary, forgetSummary]);
  return <DisclosureContext.Provider value={value}>{children}</DisclosureContext.Provider>;
}
/** One expansion per rendered list. Standalone service sections share an enclosing list when composed. */
export function ServiceRequestDisclosureGroup({ children, scope = 'ALL' }: { children: ReactNode; scope?: string }) {
  const parent = useContext(DisclosureContext);
  return parent ? <>{children}</> : <DisclosureRoot scope={scope}>{children}</DisclosureRoot>;
}
interface Props {
  id: string;
  title: string;
  summary: string;
  status: string;
  testID: string;
  children: ReactNode;
  edit?: { label: string; testID?: string; disabled?: boolean; onPress: () => void };
  actions?: ReactNode;
  total?: string;
}
/** Compact two-row summary; the shared measured height prevents clipping at large font sizes.
 * Native measurement raises every collapsed card to the tallest visible summary.
 * Individual lines are mounted only after explicit disclosure.
 * The reserved control column keeps that width stable when the chevron appears/disappears.
 * Editing and disclosure are sibling targets, so disclosure never bubbles into editing.
 */
export function ServiceRequestDisclosure({ id, title, summary, status, testID, children, edit, actions, total }: Props) {
  const group = useContext(DisclosureContext);
  const { fontScale } = useWindowDimensions();
  const [localExpanded, setLocalExpanded] = useState(false);
  const [summaryHeight, setSummaryHeight] = useState(0);
  const [detailsHeight, setDetailsHeight] = useState(0);
  const [section, setSection] = useState<{y:number;height:number}>({y:tokens.layout.controlHeight,height:tokens.layout.controlHeight});
  const collapsedHeight = Math.max(tokens.layout.controlHeight * 2 * Math.max(1,fontScale),group?.summaryHeight??summaryHeight);
  const hasDetails = !!children;
  const controlsWidth=(hasDetails?tokens.layout.controlHeight:0)+(actions?tokens.layout.buttonHeight+(hasDetails?tokens.space.xs:0):0);
  const expanded = hasDetails && (group ? group.expandedId === id : localExpanded);
  const forgetSummary=group?.forgetSummary;
  useEffect(()=>()=>forgetSummary?.(id),[forgetSummary,id]);
  const measure = (event: LayoutChangeEvent) => {
    const height=event.nativeEvent.layout.height;
    if(Number.isFinite(height)&&height>=0){setSummaryHeight(current=>current===height?current:height);group?.reportSummary(id,height);}
  };
  const measureDetails = (event: LayoutChangeEvent) => {
    const height=event.nativeEvent.layout.height;
    if(Number.isFinite(height)&&height>=0)setDetailsHeight(current=>current===height?current:height);
  };
  const measureSection=(event:LayoutChangeEvent)=>{
    const {y,height}=event.nativeEvent.layout;
    if(Number.isFinite(y)&&Number.isFinite(height))setSection(current=>current.y===y&&current.height===height?current:{y,height});
  };
  return <View style={[styles.card, disclosureStyles.card]} testID={testID}>
    <Pressable accessibilityRole={edit ? 'button' : undefined} accessibilityLabel={edit?.label} accessibilityHint={edit ? `${summary}. ${status}.` : undefined}
      accessibilityState={edit ? { disabled: !!edit.disabled } : undefined} disabled={!edit || edit.disabled}
      onPress={edit?.onPress} style={[disclosureStyles.viewport, {height:expanded?Math.max(collapsedHeight,(summaryHeight||collapsedHeight)+detailsHeight):collapsedHeight}]}
      testID={edit?.testID ?? `${testID}-body`}>
      <View onLayout={measure} style={disclosureStyles.content} testID={`${testID}-content`}>
        <View style={disclosureStyles.heading} testID={`${testID}-heading`}>
          <Text style={[styles.title,disclosureStyles.title]}>{title}</Text>
          <Text style={[styles.status,disclosureStyles.status]}>{status}</Text>
        </View>
        <View onLayout={measureSection} style={[disclosureStyles.scheduleRow,{paddingRight:controlsWidth?controlsWidth+tokens.space.xs:0,minHeight:controlsWidth?tokens.layout.controlHeight:undefined}]} testID={`${testID}-schedule`}>
          {summary ? <Text style={[styles.summary,disclosureStyles.summary]}>{summary}</Text> : null}
          {total ? <Text style={[styles.summary,disclosureStyles.total]}>Total · {total}</Text> : null}
        </View>
      </View>
      {expanded ? <View onLayout={measureDetails} style={[disclosureStyles.details,{top:summaryHeight||collapsedHeight}]} testID={`${testID}-details`}>{children}</View> : null}
    </Pressable>
    <View style={[disclosureStyles.controls,{top:section.y+Math.max(0,(section.height-tokens.layout.controlHeight)/2)}]} testID={`${testID}-controls`}>
      {hasDetails ? <Pressable accessibilityRole="button" accessibilityLabel={`${expanded ? 'Contraer' : 'Expandir'} detalles de ${title}`}
        accessibilityHint="Muestra u oculta el contenido completo dentro del listado." accessibilityState={{ expanded }}
        onPress={() => group ? group.toggle(id) : setLocalExpanded(current => !current)}
        style={disclosureStyles.toggle} testID={`${testID}-toggle`}>
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={expanded ? disclosureStyles.chevronExpanded : undefined} testID={`${testID}-chevron`}>
          <SymbolView name={guestFeatureIcons.chevronDown} size={20} tintColor={tokens.color.inkStrong}/>
        </View>
      </Pressable> : null}
      {actions}
    </View>
  </View>;
}
const disclosureStyles = StyleSheet.create({
  card: { alignItems:'stretch',flexDirection:'column',gap:0,padding:0 },
  viewport: { alignSelf:'stretch',overflow:'hidden' },
  content: { position:'absolute',top:0,left:0,right:0,gap:tokens.space.xs,paddingHorizontal:tokens.space.md,paddingVertical:tokens.space.sm },
  heading: { flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:tokens.space.xs },
  scheduleRow: { flexDirection:'row',alignItems:'center',gap:tokens.space.xs },
  details: { position:'absolute',left:0,right:0,gap:tokens.space.xs,paddingHorizontal:tokens.space.md,paddingBottom:tokens.space.md },
  title: { flex:1,lineHeight:20 },
  summary: { flex:1,lineHeight:18 },
  total: { flexShrink:1,alignSelf:'center',textAlign:'right',lineHeight:18 },
  status: { maxWidth:'48%',lineHeight:16 },
  controls: { position:'absolute',right:tokens.space.md,flexDirection:'row',alignItems:'center',gap:tokens.space.xs,justifyContent:'center' },
  toggle: { alignItems: 'center', justifyContent: 'center', minHeight: tokens.layout.controlHeight, width: tokens.layout.controlHeight },
  chevronExpanded: { transform: [{ rotate: '180deg' }] },
});
