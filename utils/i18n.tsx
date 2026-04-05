import React, { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'es' | 'en';
const LANG_KEY = 'app_language';

// Almacenamiento compatible con web (localStorage) y nativo (expo-secure-store)
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    const SecureStore = await import('expo-secure-store');
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof localStorage !== 'undefined') { localStorage.setItem(key, value); return; }
    const SecureStore = await import('expo-secure-store');
    return SecureStore.setItemAsync(key, value);
  },
};

const translations = {
  es: {
    tabs: {
      contacts: 'Contactos',
      config: 'Configuración',
    },
    common: {
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      add: '+ Agregar',
      back: 'Atrás',
      next: 'Siguiente',
      error: 'Error',
      required: '*',
      noContactsAvailable: 'No hay contactos disponibles',
    },
    contacts: {
      search: 'Buscar',
      all: 'Todos',
      empty: 'Sin contactos',
      newContact: 'Nuevo Contacto',
      firstName: 'Nombre',
      firstNamePlaceholder: 'Ingresa el nombre',
      middleName: 'Segundo nombre',
      middleNamePlaceholder: 'Ingresa el segundo nombre',
      surname: 'Apellido',
      surnamePlaceholder: 'Ingresa el apellido',
      birthdate: 'Fecha de nacimiento',
      birthdatePlaceholder: 'DD/MM/AAAA',
      gender: 'Género',
      male: '♂ Masculino',
      female: '♀ Femenino',
      maritalStatus: 'Estado civil',
      hasDoc: 'Tiene documento de identidad',
      docType: 'Tipo de documento',
      docNumber: 'Número de documento',
      docNumberPlaceholder: 'Ingresa el número',
      phone: 'Celular',
      phonePlaceholder: '+58 412 000 0000',
      email: 'Correo electrónico',
      emailPlaceholder: 'correo@ejemplo.com',
      nameRequired: 'Nombre y apellido son obligatorios',
      createError: 'Error al crear el contacto',
    },
    contactInfo: {
      title: 'Contacto',
      emptyPhones: 'Sin teléfonos',
      emptyEmails: 'Sin correos',
      phones: 'Teléfonos',
      emails: 'Correos electrónicos',
      addPhone: 'Agregar teléfono',
      addEmail: 'Agregar correo',
      phoneLabel: 'Etiqueta (ej: Celular, Casa)',
      emailLabel: 'Etiqueta (ej: Personal, Trabajo)',
      call: 'Llamar',
      sendEmail: 'Enviar',
      phoneRequired: 'El número de teléfono es obligatorio',
      emailRequired: 'El correo electrónico es obligatorio',
      deletePhone: 'Eliminar teléfono',
      deleteEmail: 'Eliminar correo',
      deletePhoneConfirm: (phone: string) => `¿Eliminar ${phone}?`,
      deleteEmailConfirm: (email: string) => `¿Eliminar ${email}?`,
    },
    detail: {
      details: 'Detalles',
      nameLabel: 'NOMBRE',
      dobLabel: 'FECHA DE NACIMIENTO',
      maritalLabel: 'ESTADO CIVIL',
      genderLabel: 'GÉNERO',
      notFound: 'Contacto no encontrado',
      loadError: 'Error al cargar el contacto',
      back: 'Volver',
    },
    age: {
      years: (n: number) => n === 1 ? '1 año' : `${n} años`,
      months: (n: number) => n === 1 ? '1 mes' : `${n} meses`,
      days: (n: number) => n === 1 ? '1 día' : `${n} días`,
      today: 'Hoy cumple años',
    },
    editContact: {
      title: 'Editar Contacto',
      saveError: 'No se pudo guardar el contacto',
    },
    documents: {
      title: 'Documentos',
      empty: 'Sin documentos registrados',
      addTitle: 'Agregar documento',
      docType: 'Tipo de documento',
      number: 'Número',
      numberRequired: 'El número de documento es obligatorio',
      issueDate: 'Fecha de expedición',
      expiryDate: 'Fecha de vencimiento',
      issuedLabel: 'Expedición:',
      expiryLabel: 'Vencimiento:',
      deleteTitle: 'Eliminar documento',
      deleteConfirm: (type: string, num: string) => `¿Eliminar ${type} ${num}?`,
      cedularError: 'Ya existe una Cédula para este contacto.',
      saveError: 'No se pudo guardar el documento.',
    },
    relationships: {
      title: 'Relaciones',
      empty: 'Sin relaciones registradas',
      whatRelationship: '¿Qué relación tiene?',
      whichContact: '¿Cuál contacto?',
      search: 'Buscar contacto...',
      deleteTitle: 'Eliminar relación',
      deleteConfirm: (name: string, rel: string) => `¿Eliminar a ${name} como ${rel}?`,
      saveError: 'No se pudo guardar la relación. Puede que ya exista.',
    },
    organizations: {
      title: 'Organizaciones',
      empty: 'Sin organizaciones registradas',
      addTitle: 'Agregar organización',
      orgName: 'Organización',
      orgNameRequired: 'El nombre de la organización es obligatorio',
      achievement: 'Logro / título obtenido',
      achievementPlaceholder: 'Ej: Bachiller, Licenciado en...',
      date: 'Fecha',
      deleteTitle: 'Eliminar organización',
      deleteConfirm: (name: string) => `¿Eliminar la vinculación con "${name}"?`,
      saveError: 'No se pudo guardar la organización',
    },
    keywords: {
      title: 'Palabras clave',
      empty: 'Sin palabras clave',
      placeholder: 'Nueva palabra clave...',
      duplicate: 'Esa palabra clave ya existe.',
      deleteTitle: 'Eliminar',
      deleteConfirm: (kw: string) => `¿Eliminar "${kw}"?`,
    },
    bankAccounts: {
      title: 'Cuentas bancarias',
      empty: 'Sin cuentas registradas',
      addTitle: 'Agregar cuenta bancaria',
      bankName: 'Banco',
      bankNamePlaceholder: 'Ej: Banco Mercantil',
      accountNumber: 'Número de cuenta',
      accountNumberRequired: 'El número de cuenta es obligatorio',
      accountType: 'Tipo de cuenta',
      accountTypePlaceholder: 'Ej: Ahorro, Corriente',
      label: 'Etiqueta',
      labelPlaceholder: 'Ej: De la empresa, Para pagos recurrentes',
      deleteTitle: 'Eliminar cuenta',
      deleteConfirm: (num: string) => `¿Eliminar cuenta ${num}?`,
      saveError: 'No se pudo guardar la cuenta.',
    },
    zodiac: {
      aries:       { name: 'Aries',       description: 'Valiente, impulsivo y apasionado' },
      taurus:      { name: 'Tauro',       description: 'Paciente, confiable y persistente' },
      gemini:      { name: 'Géminis',     description: 'Curioso, adaptable y comunicativo' },
      cancer:      { name: 'Cáncer',      description: 'Intuitivo, protector y sensible' },
      leo:         { name: 'Leo',         description: 'Carismático, generoso y seguro de sí' },
      virgo:       { name: 'Virgo',       description: 'Analítico, metódico y perfeccionista' },
      libra:       { name: 'Libra',       description: 'Diplomático, justo y armonioso' },
      scorpio:     { name: 'Escorpio',    description: 'Intenso, apasionado y misterioso' },
      sagittarius: { name: 'Sagitario',   description: 'Aventurero, optimista y libre' },
      capricorn:   { name: 'Capricornio', description: 'Ambicioso, disciplinado y responsable' },
      aquarius:    { name: 'Acuario',     description: 'Innovador, independiente y humanitario' },
      pisces:      { name: 'Piscis',      description: 'Empático, creativo y soñador' },
    },
    config: {
      title: 'Configuración',
      notifications: 'Notificaciones de cumpleaños',
      notificationsDesc: 'Programa alertas para el día anterior al cumpleaños de cada contacto (9:00 AM).',
      notificationsActive: (n: number) => `\n${n} notificación${n !== 1 ? 'es' : ''} activa${n !== 1 ? 's' : ''}.`,
      scheduleBtn: '🔔 Programar notificaciones',
      notificationsUnavailable: '⚠️ Las notificaciones no están disponibles en Expo Go. Requieren un development build.',
      database: 'Base de datos',
      databaseDesc: 'Exportá una copia de seguridad o importá una base de datos existente.',
      exportBtn: '⬆ Exportar',
      importBtn: '⬇ Importar',
      importVcfBtn: '📋 Importar VCF (v4.0)',
      language: 'Idioma',
      languageDesc: 'Seleccioná el idioma de la aplicación.',
      exportSuccess: 'Base de datos exportada correctamente.',
      importSuccess: 'Base de datos importada. Reiniciá la app para ver los cambios.',
      importTitle: 'Importar base de datos',
      importConfirm: 'Esto reemplazará todos los datos actuales. ¿Querés continuar?',
      importSuccessTitle: 'Importación exitosa',
      importSuccessMsg: 'Reiniciá la aplicación para que los cambios tomen efecto.',
      importContinue: 'Continuar',
      notifPermError: 'Error: no se concedieron permisos de notificación.',
      notifScheduled: (n: number) => `${n} notificación${n !== 1 ? 'es' : ''} programada${n !== 1 ? 's' : ''} correctamente.`,
      dbNotFound: 'Error: no se encontró la base de datos.',
      sharingUnavailable: 'Error: compartir archivos no está disponible en este dispositivo.',
      exportErrorPrefix: 'Error al exportar: ',
      importErrorPrefix: 'Error al importar: ',
      notifErrorPrefix: 'Error: ',
    },
    drive: {
      title: 'Google Drive',
      desc: 'Guardá y restaurá tu base de datos en la nube.',
      upload: '☁ Guardar en Drive',
      restore: '☁ Restaurar desde Drive',
      uploading: 'Subiendo...',
      restoring: 'Restaurando...',
      uploadSuccess: 'Base de datos guardada en Google Drive ✓',
      restoreSuccess: 'Restaurada desde Drive. Reiniciá la app.',
      notFound: 'No se encontró backup en Google Drive.',
      tokenExpired: 'Sesión expirada. Cerrá sesión y volvé a iniciar.',
      signInRequired: 'Iniciá sesión con Google para usar Drive.',
      errorPrefix: 'Error: ',
      sessionExpiredTitle: 'Sesión de Drive expirada',
      sessionExpiredMsg: 'Tu sesión de Google Drive no está activa. ¿Querés iniciar sesión nuevamente?',
      notLoggedInTitle: 'Sesión no iniciada',
      notLoggedInMsg: 'Necesitás iniciar sesión con Google para usar Drive.',
      signInBtn: 'Iniciar sesión',
    },
  },

  en: {
    tabs: {
      contacts: 'Contacts',
      config: 'Settings',
    },
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: '+ Add',
      back: 'Back',
      next: 'Next',
      error: 'Error',
      required: '*',
      noContactsAvailable: 'No contacts available',
    },
    contacts: {
      search: 'Search',
      all: 'All',
      empty: 'No contacts',
      newContact: 'New Contact',
      firstName: 'First name',
      firstNamePlaceholder: 'Enter first name',
      middleName: 'Middle name',
      middleNamePlaceholder: 'Enter middle name',
      surname: 'Surname',
      surnamePlaceholder: 'Enter surname',
      birthdate: 'Date of birth',
      birthdatePlaceholder: 'DD/MM/YYYY',
      gender: 'Gender',
      male: '♂ Male',
      female: '♀ Female',
      maritalStatus: 'Marital status',
      hasDoc: 'Has identity document',
      docType: 'Document type',
      docNumber: 'Document number',
      docNumberPlaceholder: 'Enter number',
      phone: 'Phone',
      phonePlaceholder: '+1 555 000 0000',
      email: 'Email',
      emailPlaceholder: 'email@example.com',
      nameRequired: 'First name and surname are required',
      createError: 'Error creating contact',
    },
    contactInfo: {
      title: 'Contact',
      emptyPhones: 'No phones',
      emptyEmails: 'No emails',
      phones: 'Phone numbers',
      emails: 'Email addresses',
      addPhone: 'Add phone',
      addEmail: 'Add email',
      phoneLabel: 'Label (e.g. Mobile, Home)',
      emailLabel: 'Label (e.g. Personal, Work)',
      call: 'Call',
      sendEmail: 'Send',
      phoneRequired: 'Phone number is required',
      emailRequired: 'Email address is required',
      deletePhone: 'Delete phone',
      deleteEmail: 'Delete email',
      deletePhoneConfirm: (phone: string) => `Delete ${phone}?`,
      deleteEmailConfirm: (email: string) => `Delete ${email}?`,
    },
    detail: {
      details: 'Details',
      nameLabel: 'NAME',
      dobLabel: 'DATE OF BIRTH',
      maritalLabel: 'MARITAL STATUS',
      genderLabel: 'GENDER',
      notFound: 'Contact not found',
      loadError: 'Error loading contact',
      back: 'Back',
    },
    age: {
      years: (n: number) => n === 1 ? '1 year' : `${n} years`,
      months: (n: number) => n === 1 ? '1 month' : `${n} months`,
      days: (n: number) => n === 1 ? '1 day' : `${n} days`,
      today: 'Birthday today',
    },
    editContact: {
      title: 'Edit Contact',
      saveError: 'Could not save contact',
    },
    documents: {
      title: 'Documents',
      empty: 'No documents registered',
      addTitle: 'Add document',
      docType: 'Document type',
      number: 'Number',
      numberRequired: 'Document number is required',
      issueDate: 'Issue date',
      expiryDate: 'Expiry date',
      issuedLabel: 'Issued:',
      expiryLabel: 'Expires:',
      deleteTitle: 'Delete document',
      deleteConfirm: (type: string, num: string) => `Delete ${type} ${num}?`,
      cedularError: 'A Cédula already exists for this contact.',
      saveError: 'Could not save document.',
    },
    relationships: {
      title: 'Relationships',
      empty: 'No relationships registered',
      whatRelationship: 'What relationship?',
      whichContact: 'Which contact?',
      search: 'Search contact...',
      deleteTitle: 'Delete relationship',
      deleteConfirm: (name: string, rel: string) => `Delete ${name} as ${rel}?`,
      saveError: 'Could not save relationship. It may already exist.',
    },
    organizations: {
      title: 'Organizations',
      empty: 'No organizations registered',
      addTitle: 'Add organization',
      orgName: 'Organization',
      orgNameRequired: 'Organization name is required',
      achievement: 'Achievement / title obtained',
      achievementPlaceholder: "E.g. Bachelor's degree, Master's in...",
      date: 'Date',
      deleteTitle: 'Remove organization',
      deleteConfirm: (name: string) => `Remove link with "${name}"?`,
      saveError: 'Could not save organization',
    },
    keywords: {
      title: 'Keywords',
      empty: 'No keywords',
      placeholder: 'New keyword...',
      duplicate: 'That keyword already exists.',
      deleteTitle: 'Delete',
      deleteConfirm: (kw: string) => `Delete "${kw}"?`,
    },
    bankAccounts: {
      title: 'Bank accounts',
      empty: 'No accounts registered',
      addTitle: 'Add bank account',
      bankName: 'Bank',
      bankNamePlaceholder: 'E.g. Chase Bank',
      accountNumber: 'Account number',
      accountNumberRequired: 'Account number is required',
      accountType: 'Account type',
      accountTypePlaceholder: 'E.g. Savings, Checking',
      label: 'Label',
      labelPlaceholder: 'E.g. Company account, For recurring payments',
      deleteTitle: 'Delete account',
      deleteConfirm: (num: string) => `Delete account ${num}?`,
      saveError: 'Could not save account.',
    },
    zodiac: {
      aries:       { name: 'Aries',       description: 'Bold, impulsive and passionate' },
      taurus:      { name: 'Taurus',      description: 'Patient, reliable and persistent' },
      gemini:      { name: 'Gemini',      description: 'Curious, adaptable and communicative' },
      cancer:      { name: 'Cancer',      description: 'Intuitive, protective and sensitive' },
      leo:         { name: 'Leo',         description: 'Charismatic, generous and confident' },
      virgo:       { name: 'Virgo',       description: 'Analytical, methodical and perfectionist' },
      libra:       { name: 'Libra',       description: 'Diplomatic, fair and harmonious' },
      scorpio:     { name: 'Scorpio',     description: 'Intense, passionate and mysterious' },
      sagittarius: { name: 'Sagittarius', description: 'Adventurous, optimistic and free-spirited' },
      capricorn:   { name: 'Capricorn',   description: 'Ambitious, disciplined and responsible' },
      aquarius:    { name: 'Aquarius',    description: 'Innovative, independent and humanitarian' },
      pisces:      { name: 'Pisces',      description: 'Empathetic, creative and dreamy' },
    },
    config: {
      title: 'Settings',
      notifications: 'Birthday notifications',
      notificationsDesc: "Schedule alerts for the day before each contact's birthday (9:00 AM).",
      notificationsActive: (n: number) => `\n${n} active notification${n !== 1 ? 's' : ''}.`,
      scheduleBtn: '🔔 Schedule notifications',
      notificationsUnavailable: '⚠️ Notifications are not available in Expo Go. A development build is required.',
      database: 'Database',
      databaseDesc: 'Export a backup or import an existing database.',
      exportBtn: '⬆ Export',
      importBtn: '⬇ Import',
      importVcfBtn: '📋 Import VCF (v4.0)',
      language: 'Language',
      languageDesc: 'Select the app language.',
      exportSuccess: 'Database exported successfully.',
      importSuccess: 'Database imported. Restart the app to see changes.',
      importTitle: 'Import database',
      importConfirm: 'This will replace all current data. Do you want to continue?',
      importSuccessTitle: 'Import successful',
      importSuccessMsg: 'Restart the application for changes to take effect.',
      importContinue: 'Continue',
      notifPermError: 'Error: notification permissions were not granted.',
      notifScheduled: (n: number) => `${n} notification${n !== 1 ? 's' : ''} scheduled successfully.`,
      dbNotFound: 'Error: database not found.',
      sharingUnavailable: 'Error: file sharing is not available on this device.',
      exportErrorPrefix: 'Export error: ',
      importErrorPrefix: 'Import error: ',
      notifErrorPrefix: 'Error: ',
    },
    drive: {
      title: 'Google Drive',
      desc: 'Save and restore your database to the cloud.',
      upload: '☁ Save to Drive',
      restore: '☁ Restore from Drive',
      uploading: 'Uploading...',
      restoring: 'Restoring...',
      uploadSuccess: 'Database saved to Google Drive ✓',
      restoreSuccess: 'Restored from Drive. Restart the app.',
      notFound: 'No backup found in Google Drive.',
      tokenExpired: 'Session expired. Sign out and sign in again.',
      signInRequired: 'Sign in with Google to use Drive.',
      errorPrefix: 'Error: ',
      sessionExpiredTitle: 'Drive session expired',
      sessionExpiredMsg: 'Your Google Drive session is not active. Do you want to sign in again?',
      notLoggedInTitle: 'Not signed in',
      notLoggedInMsg: 'You need to sign in with Google to use Drive.',
      signInBtn: 'Sign in',
    },
  },
} as const;

export type T = typeof translations.es;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: T;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'es',
  setLang: () => {},
  t: translations.es,
});

function detectDeviceLang(): Lang {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale.startsWith('es') ? 'es' : 'en';
  } catch {
    return 'es';
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es');

  useEffect(() => {
    storage.getItem(LANG_KEY).then(stored => {
      if (stored === 'es' || stored === 'en') {
        setLangState(stored);
      } else {
        setLangState(detectDeviceLang());
      }
    });
  }, []);

  const setLang = async (newLang: Lang) => {
    setLangState(newLang);
    await storage.setItem(LANG_KEY, newLang);
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t: translations[lang] as T }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
