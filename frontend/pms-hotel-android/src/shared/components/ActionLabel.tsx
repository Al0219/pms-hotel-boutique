import {Text,View,StyleSheet,type StyleProp,type TextStyle} from 'react-native';
import {SymbolView} from 'expo-symbols';
import {guestFeatureIcons} from '@/modules/navigation/guestFeatureIcons';
export function ActionLabel({label,textStyle}:{label:string;textStyle?:StyleProp<TextStyle>}){
 const icon=/vehículo|vehiculo|parqueo/i.test(label)?guestFeatureIcons.vehicle:/documento|pdf|compartir/i.test(label)?guestFeatureIcons.invoice:/pago|abonar|saldo/i.test(label)?guestFeatureIcons.payment:/volver|cancelar/i.test(label)?guestFeatureIcons.chevronLeft:/confirmar|guardar|enviar|solicitar/i.test(label)?guestFeatureIcons.confirm:undefined;
 return <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,flexShrink:1}}>{icon?<SymbolView name={icon} size={18} tintColor={StyleSheet.flatten(textStyle)?.color??'#26302b'} accessibilityElementsHidden importantForAccessibility="no"/>:null}<Text style={[textStyle,{flexShrink:1,textAlign:'center'}]}>{label}</Text></View>;
}
