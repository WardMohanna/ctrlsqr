import { useEffect, useState, useCallback, useRef } from 'react';
import { FormInstance } from 'antd';
import dayjs from 'dayjs';

interface FormPersistenceOptions {
  formKey: string; // Unique key for this form in localStorage
  form: FormInstance;
  additionalData?: Record<string, any>; // Extra data to save (like selectedItem, components, etc.)
  onRestore?: (data: any) => void; // Callback when data is restored
}

interface SavedFormData {
  formValues: any;
  additionalData?: Record<string, any>;
  timestamp: number;
}

// Helper to check if data has changed from initial state
function hasDataChanged(current: Record<string, any>, initial: Record<string, any>): boolean {
  const currentKeys = Object.keys(current);
  
  for (const key of currentKeys) {
    const currentVal = current[key];
    const initialVal = initial[key];
    
    // Compare arrays
    if (Array.isArray(currentVal) && Array.isArray(initialVal)) {
      if (currentVal.length !== initialVal.length) return true;
      if (currentVal.length > 0 && JSON.stringify(currentVal) !== JSON.stringify(initialVal)) return true;
    }
    // Compare objects (including dayjs)
    else if (currentVal && typeof currentVal === 'object' && !dayjs.isDayjs(currentVal)) {
      if (JSON.stringify(currentVal) !== JSON.stringify(initialVal)) return true;
    }
    // Compare primitives
    else if (currentVal !== initialVal) {
      // Skip if both are empty/falsy
      const currentEmpty = currentVal === null || currentVal === undefined || currentVal === '' || currentVal === false || currentVal === 0;
      const initialEmpty = initialVal === null || initialVal === undefined || initialVal === '' || initialVal === false || initialVal === 0;
      if (currentEmpty && initialEmpty) continue;
      return true;
    }
  }
  
  return false;
}

export function useFormPersistence({
  formKey,
  form,
  additionalData = {},
  onRestore,
}: FormPersistenceOptions) {
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [savedDataToRestore, setSavedDataToRestore] = useState<SavedFormData | null>(null);
  const [isFormRestored, setIsFormRestored] = useState(false);
  
  // Track initial additionalData to detect changes
  const initialAdditionalDataRef = useRef<Record<string, any> | null>(null);
  const hasSavedDataRef = useRef(false);

  const storageKey = `formData_${formKey}`;
  const sessionKey = `formActive_${formKey}`;
  
  // Capture initial additionalData on first render
  useEffect(() => {
    if (initialAdditionalDataRef.current === null) {
      initialAdditionalDataRef.current = JSON.parse(JSON.stringify(additionalData));
    }
  }, []);

  // Restore form data from localStorage on mount
  useEffect(() => {
    const savedFormData = localStorage.getItem(storageKey);
    const isPageRefresh = sessionStorage.getItem(sessionKey);

    // Set flag to indicate page is active
    sessionStorage.setItem(sessionKey, 'true');

    if (savedFormData) {
      try {
        const parsedData: SavedFormData = JSON.parse(savedFormData);

        // Mark that we have existing saved data
        hasSavedDataRef.current = true;

        // If page was refreshed (flag exists), auto-restore
        // Use setTimeout to ensure Form component is mounted first
        if (isPageRefresh) {
          setTimeout(() => {
            restoreFormData(parsedData);
            setIsFormRestored(true);
          }, 0);
        } else {
          // If page was reopened (no flag), show confirmation
          setSavedDataToRestore(parsedData);
          setShowRestoreModal(true);
          setIsFormRestored(true);
        }
      } catch (error) {
        console.error(`Error restoring form data (${formKey}):`, error);
        setIsFormRestored(true);
      }
    } else {
      setIsFormRestored(true);
    }

    // Clear the session flag when component unmounts (navigating away)
    return () => {
      sessionStorage.removeItem(sessionKey);
    };
  }, [formKey, form]);

  // Function to restore form data
  const restoreFormData = useCallback((parsedData: SavedFormData) => {
    if (parsedData.formValues) {
      // Deserialize ISO strings back to dayjs objects
      const deserializedValues = Object.entries(parsedData.formValues).reduce((acc, [key, value]) => {
        // Check if value is an ISO date string
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          const dayjsObj = dayjs(value);
          if (dayjsObj.isValid()) {
            acc[key] = dayjsObj;
          } else {
            acc[key] = value;
          }
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      form.resetFields();
      form.setFieldsValue(deserializedValues);
    }

    // Call the onRestore callback with additional data
    if (onRestore && parsedData.additionalData) {
      onRestore(parsedData.additionalData);
    }
  }, [form, formKey, onRestore]);

  // Save form values when they change
  const saveFormData = useCallback(() => {
    const formValues = form.getFieldsValue();
    
    // Serialize dayjs objects to ISO strings for storage
    const serializedValues = Object.entries(formValues).reduce((acc, [key, value]) => {
      if (value && dayjs.isDayjs(value)) {
        acc[key] = value.format();
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
    
    // Check if form has any meaningful values
    const hasFormData = Object.values(serializedValues).some((val) => {
      if (val === null || val === undefined || val === '' || val === false || val === 0) return false;
      if (Array.isArray(val) && val.length === 0) return false;
      return true;
    });
    
    // Check if additionalData has changed from initial state
    const initialData = initialAdditionalDataRef.current || {};
    const additionalDataChanged = hasDataChanged(additionalData, initialData);
    
    // Only save if we have form data OR additionalData changed (or if we already have saved data)
    if (!hasSavedDataRef.current && !hasFormData && !additionalDataChanged) {
      return;
    }
    
    hasSavedDataRef.current = true;
    const dataToSave: SavedFormData = {
      formValues: serializedValues,
      additionalData,
      timestamp: Date.now(),
    };
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
  }, [form, formKey, additionalData, storageKey]);

  // Clear saved data
  const clearSavedData = useCallback(() => {
    localStorage.removeItem(storageKey);
    // Also clear the session key to prevent restore prompts after successful save
    sessionStorage.removeItem(sessionKey);
  }, [formKey, storageKey, sessionKey]);

  // Handle restore confirmation
  const handleRestoreConfirm = useCallback(() => {
    if (savedDataToRestore) {
      restoreFormData(savedDataToRestore);
    }
    setShowRestoreModal(false);
    setSavedDataToRestore(null);
  }, [savedDataToRestore, restoreFormData]);

  // Handle restore cancel
  const handleRestoreCancel = useCallback(() => {
    clearSavedData();
    setShowRestoreModal(false);
    setSavedDataToRestore(null);
  }, [clearSavedData]);

  // Save data whenever additionalData changes
  useEffect(() => {
    if (isFormRestored && Object.keys(additionalData).length > 0) {
      const timeoutId = setTimeout(saveFormData, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [additionalData, isFormRestored, saveFormData]);

  return {
    showRestoreModal,
    handleRestoreConfirm,
    handleRestoreCancel,
    saveFormData,
    clearSavedData,
    isFormRestored,
  };
}
