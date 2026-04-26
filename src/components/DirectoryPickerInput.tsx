import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { Locale } from '../types'

interface DirectoryPickerInputProps {
  id: string
  locale: Locale
  value: string
  placeholder?: string
  onChange: (value: string) => void
}

function getChooseFolderLabel(locale: Locale) {
  return locale === 'zh-CN' ? '选择文件夹' : 'Choose folder'
}

function getChoosingFolderLabel(locale: Locale) {
  return locale === 'zh-CN' ? '选择中...' : 'Choosing...'
}

export function DirectoryPickerInput({
  id,
  locale,
  value,
  placeholder,
  onChange,
}: DirectoryPickerInputProps) {
  const [choosing, setChoosing] = useState(false)

  const handleChooseDirectory = async () => {
    setChoosing(true)

    try {
      const selectedDirectory = await invoke<string | null>('select_directory')
      if (selectedDirectory) {
        onChange(selectedDirectory)
      }
    } catch (error) {
      console.error('Failed to select directory:', error)
    } finally {
      setChoosing(false)
    }
  }

  return (
    <div className="directory-picker">
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        readOnly
      />
      <button
        className="button--ghost directory-picker__button"
        type="button"
        disabled={choosing}
        onClick={handleChooseDirectory}
      >
        {choosing ? getChoosingFolderLabel(locale) : getChooseFolderLabel(locale)}
      </button>
    </div>
  )
}
