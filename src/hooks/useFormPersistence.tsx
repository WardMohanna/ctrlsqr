import { useEffect, useRef, useState } from 'react';
import { FormInstance } from 'antd';
import { Modal } from 'antd';
import { useTranslations } from 'next-intl';

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
 * and restore it on page refresh with user confirmation
 */
export function useFormPersistence({
  storageKey,
  form,
  excludeFields = [],
  additionalState = {},
  onRestore,
}: FormPersistenceOptions) {
  const isInitializedRef = useRef(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const savedDataRef = useRef<any>(null);
  const t = useTranslations('formPersistence');

  // Check for saved data on mount and show confirmation modal
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        savedDataRef.current = parsedData;
        
        // Show modal asking user if they want to restore
        setShowRestoreModal(true);
        console.log('Found saved form data, asking user to restore');
      }
    } catch (error) {
      console.error('Error checking for saved data:', error);
    }
    
    isInitializedRef.current = true;
  }, [storageKey]);

  // Handle restore confirmation
  const handleRestoreConfirm = () => {
    try {
      const parsedData = savedDataRef.current;
      if (parsedData) {
        // Filter out excluded fields
        const formData = { ...parsedData.formValues };
        excludeFields.forEach(field => {
          delete formData[field];
        });
        
        // Call restore callback with additional state FIRST
        // This ensures states like autoAssignSKU are restored before form values
        if (onRestore && parsedData.additionalState) {
          onRestore(parsedData.additionalState);
        }
        
        // Set form values after a short delay to ensure state updates have propagated
        setTimeout(() => {
          form.setFieldsValue(formData);
          console.log('Form data restored from localStorage', formData);
        }, 10);
      }
    } catch (error) {
      console.error('Error restoring form data:', error);
    }
    setShowRestoreModal(false);
  };

  // Handle restore cancellation
  const handleRestoreCancel = () => {
    // Clear the saved data since user doesn't want to restore
    try {
      localStorage.removeItem(storageKey);
      console.log('User declined restore, saved data cleared');
    } catch (error) {
      console.error('Error clearing saved data:', error);
    }
    setShowRestoreModal(false);
  };

  // Render the restore confirmation modal
  const RestoreModal = () => {
    if (!showRestoreModal) return null;
    
    return (
      <Modal
        title={`📋 ${t('restoreTitle')}`}
        open={showRestoreModal}
        onOk={handleRestoreConfirm}
        onCancel={handleRestoreCancel}
        okText={t('yesRestore')}
        cancelText={t('noStartFresh')}
        closable={false}
        maskClosable={false}
      >
        <p>{t('restoreMessage')}</p>
        <p>{t('restoreQuestion')}</p>
      </Modal>
    );
  };

  // Save form data to localStorage whenever form or additionalState changes
  useEffect(() => {
    if (!isInitializedRef.current) return;

    const saveFormData = () => {
      try {
        // Get all field values including untouched ones
        const formValues = form.getFieldsValue(true);
        
        // Check if form has any meaningful data (not just initial values)
        const hasData = Object.keys(formValues).length > 0 && Object.values(formValues).some(value => {
          // Allow 0, false, and empty strings as valid values
          if (value === undefined || value === null) return false;
          if (Array.isArray(value) && value.length === 0) return false;
          // Consider any other value (including 0, false, "") as data
          return true;
        });

        // Also check additional state
        const hasAdditionalData = Object.keys(additionalState).length > 0 && Object.values(additionalState).some(value => {
          if (value === undefined || value === null) return false;
          if (Array.isArray(value) && value.length === 0) return false;
          return true;
        });

        if (hasData || hasAdditionalData) {
          const dataToSave = {
            formValues,
            additionalState,
            timestamp: new Date().toISOString(),
          };
          
          localStorage.setItem(storageKey, JSON.stringify(dataToSave));
          console.log('Form data saved to localStorage', dataToSave);
        }
      } catch (error) {
        console.error('Error saving form data:', error);
      }
    };

    // Debounce saving
    const timeoutId = setTimeout(saveFormData, 500);

    return () => clearTimeout(timeoutId);
  }, [storageKey, form, JSON.stringify(additionalState)]);

  // Clear saved data
  const clearSavedData = () => {
    try {
      localStorage.removeItem(storageKey);
      console.log('Saved form data cleared');
    } catch (error) {
      console.error('Error clearing saved data:', error);
    }
  };

  return { clearSavedData, RestoreModal };
}
