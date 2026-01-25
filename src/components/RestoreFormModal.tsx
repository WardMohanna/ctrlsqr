import React from 'react';
import { Modal } from 'antd';
import { useTranslations } from 'next-intl';

interface RestoreFormModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  translationKey?: string; // e.g., 'inventory.add', 'supplier.add'
}

export function RestoreFormModal({
  open,
  onConfirm,
  onCancel,
  translationKey = 'inventory.add',
}: RestoreFormModalProps) {
  const t = useTranslations(translationKey);

  return (
    <Modal
      title={t('restoreFormTitle') || 'Restore Previous Data?'}
      open={open}
      onOk={onConfirm}
      onCancel={onCancel}
      okText={t('restoreYes') || 'Yes, Restore'}
      cancelText={t('restoreNo') || 'No, Start Fresh'}
    >
      <p>
        {t('restoreFormMessage') ||
          'You have unsaved form data from a previous session. Would you like to restore it?'}
      </p>
    </Modal>
  );
}
