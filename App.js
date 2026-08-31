// App.js
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Image, SafeAreaView,
Switch, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
export default function App() {
const [activeTab, setActiveTab] = useState('PROFILE');
// Profile Form States
const [name, setName] = useState('Puskar Karki');
const [originCountry] = useState('Nepal ');
const [currentCity, setCurrentCity] = useState('Tokyo, Japan ');
const [qualification, setQualification] = useState('Bachelor in Computer Science');
const [occupation, setOccupation] = useState('Software Engineer');
const [profilePicture, setProfilePicture] = useState(null);
// Security & Privacy Settings
const [allowDirectCalls, setAllowDirectCalls] = useState(false);
// Image Picker Logic
const pickImage = async () => {
const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
if (!perm.granted) return Alert.alert('Permission Denied', 'Gallery access is required.');
let result = await ImagePicker.launchImageLibraryAsync({
allowsEditing: true,
aspect: [1, 1],
quality: 0.8,
});
if (!result.canceled) setProfilePicture(result.assets[0].uri);
};
return (
{/* Navigation Bar */}
setActiveTab('PROFILE')} style={[styles.navBtn, activeTab === 'PROFILE' &&
styles.activeNav]}>
प्रोफाइल
setActiveTab('MATCHES')} style={[styles.navBtn, activeTab === 'MATCHES' &&
styles.activeNav]}>
म्याचि खोज्नुहोसि्
setActiveTab('SETTINGS')} style={[styles.navBtn, activeTab === 'SETTINGS' &&
styles.activeNav]}>
सिेक्युɝरटी सिेɞटङ

{/* Profile Section */}
{activeTab === 'PROFILE' && (
NepalMatch प्रोफाइल सिेटअप

फोटो रोज्नुहोसि् / Edit

पुरा नाम (Full Name)
उत्पɢत्ति / देश (Origin)
हाल बसिोबासि गɝररहेको ठाउँ (Current Living Place)
शैɢक्षिक योग्यता (Qualification)
पेशा (Occupation)
Alert.alert('Success', 'Profile saved securely.')}>
सिेभ गनुर्नहोसि्

)}
{/* Security & Privacy Settings */}
{activeTab === 'SETTINGS' && (
फे सिबुक-स्तरको सिेक्युɝरटी सिेɞटङ
नɡचिनेका व्यɡक्तिहरूबाट सिोझै ɢभɟडयो कल
Match/Request Accept नभई कल गनर्न ɞदने ɟक नɞदने?

Alert.alert('Logout', 'You have been logged out securely.')}>
लगआउट गनुर्नहोसि् (Logout)

)}
);
}
const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: '#faf8f5' },
navBar: { flexDirection: 'row', backgroundColor: '#1877f2', elevation: 4 },
navBtn: { flex: 1, padding: 14, alignItems: 'center' },
activeNav: { borderBottomWidth: 3, borderBottomColor: '#e91e63' },
navText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
body: { padding: 20 },
title: { fontSize: 18, fontWeight: 'bold', color: '#1877f2', marginBottom: 15, textAlign:
'center' },
avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: '#1877f2' },
photoBtn: { marginTop: 8, backgroundColor: '#e91e63', paddingVertical: 6, paddingHorizontal: 12,
borderRadius: 15 },
label: { fontSize: 12, fontWeight: 'bold', color: '#333', marginTop: 10 },
input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, backgroundColor:
'#fff', marginTop: 4 },
saveBtn: { backgroundColor: '#1877f2', padding: 14, borderRadius: 6, alignItems: 'center',
marginTop: 20 },
settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
paddingVertical: 15, borderBottomWidth: 1, borderColor: '#ddd' },
reportBtn: { backgroundColor: '#dc3545', padding: 14, borderRadius: 6, marginTop: 30 }
});