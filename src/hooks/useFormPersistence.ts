import { useEffect, useState, useCallback } from 'react';
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

export function useFormPersistence({
  formKey,
  form,
  additionalData = {},
  onRestore,
}: FormPersistenceOptions) {
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [savedDataToRestore, setSavedDataToRestore] = useState<SavedFormData | null>(null);
  const [isFormRestored, setIsFormRestored] = useState(false);

  const storageKey = `formData_${formKey}`;
  const sessionKey = `formActive_${formKey}`;

  // Restore form data from localStorage on mount
  useEffect(() => {
    const savedFormData = localStorage.getItem(storageKey);
    const isPageRefresh = sessionStorage.getItem(sessionKey);

    // Set flag to indicate page is active
    sessionStorage.setItem(sessionKey, 'true');

    if (savedFormData) {
      try {
        const parsedData: SavedFormData = JSON.parse(savedFormData);

        // If page was refreshed (flag exists), auto-restore
        if (isPageRefresh) {
          restoreFormData(parsedData);
        } else {
          // If page was reopened (no flag), show confirmation
          setSavedDataToRestore(parsedData);
          setShowRestoreModal(true);
        }

        setIsFormRestored(true);
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
  }, [formKey, storageKey]);

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
