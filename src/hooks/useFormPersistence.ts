import { useEffect, useRef } from 'react';
import { FormInstance } from 'antd';

interface FormPersistenceOptions {
  storageKey: string;
  form: FormInstance;
  excludeFields?: string[];
  additionalState?: {
    [key: string]: any;
  };
  onRestore?: (data: any) => void;
}

/**
 * Custom hook to persist form data to localStorage
 * and restore it on page refresh
 */
export function useFormPersistence({
  storageKey,
  form,
  excludeFields = [],
  additionalState = {},
  onRestore,
}: FormPersistenceOptions) {
  const isRestoredRef = useRef(false);
  const isSavingRef = useRef(false);

  // Restore form data on mount
  useEffect(() => {
    if (isRestoredRef.current) return;
    
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        // Filter out excluded fields
        const formData = { ...parsedData.formValues };
        excludeFields.forEach(field => {
          delete formData[field];
        });
        
        // Set form values
        form.setFieldsValue(formData);
        
        // Call restore callback with additional state
        if (onRestore && parsedData.additionalState) {
          onRestore(parsedData.additionalState);
        }
        
        console.log('Form data restored from localStorage');
      }
    } catch (error) {
      console.error('Error restoring form data:', error);
    }
    
    isRestoredRef.current = true;
  }, [storageKey, form, excludeFields, onRestore]);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (!isRestoredRef.current || isSavingRef.current) return;

    const saveFormData = () => {
      try {
        const formValues = form.getFieldsValue();
        
        // Check if form has any data
        const hasData = Object.values(formValues).some(value => {
          if (value === undefined || value === null || value === '') return false;
          if (Array.isArray(value) && value.length === 0) return false;
          return true;
        });

        if (hasData) {
          const dataToSave = {
            formValues,
            additionalState,
            timestamp: new Date().toISOString(),
          };
          
          localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        }
      } catch (error) {
        console.error('Error saving form data:', error);
      }
    };

    // Debounce saving
    const timeoutId = setTimeout(saveFormData, 500);

    return () => clearTimeout(timeoutId);
  }, [storageKey, form, additionalState]);

  // Clear saved data
  const clearSavedData = () => {
    try {
      localStorage.removeItem(storageKey);
      console.log('Saved form data cleared');
    } catch (error) {
      console.error('Error clearing saved data:', error);
    }
  };

  return { clearSavedData };
}
