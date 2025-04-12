import React, { useState, useEffect } from 'react';
import { Column } from '../../types/monday';
import { ColumnType, ColumnValueOption } from '../../types/columnTypes';
import { columnService } from '../../services/api/columnService';
import { 
  TextField, 
  Dropdown, 
  DatePicker, 
  Checkbox, 
  ColorPicker,
  TextArea,
  Avatar,
  Box,
  Text
} from "monday-ui-react-core";

interface ColumnValueEditorProps {
  column: Column;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  boardId: string;
}

const ColumnValueEditor: React.FC<ColumnValueEditorProps> = ({ 
  column, 
  value, 
  onChange, 
  disabled = false,
  boardId
}) => {
  const [columnValues, setColumnValues] = useState<ColumnValueOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch column values for status and dropdown columns
  useEffect(() => {
    const fetchColumnValues = async () => {
      if (column.type === 'status' || column.type === 'dropdown') {
        try {
          setLoading(true);
          const values = await columnService.getColumnValues(column.id, boardId);
          setColumnValues(values);
        } catch (error) {
          console.error(`Error fetching values for column ${column.id}:`, error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchColumnValues();
  }, [column]);

  // Parse column settings
  const parseColumnSettings = () => {
    try {
      if (column.settings_str) {
        return JSON.parse(column.settings_str);
      }
    } catch (error) {
      console.error('Error parsing column settings:', error);
    }
    return {};
  };

  // Render the appropriate editor based on column type
  const renderEditor = () => {
    const columnType = column.type as ColumnType;
    
    switch (columnType) {
      case ColumnType.TEXT:
        return (
          <TextField
            title={column.title}
            placeholder={`Enter ${column.title.toLowerCase()}`}
            value={value || ''}
            onChange={(val: string) => onChange(val)}
            disabled={disabled}
          />
        );
        
      case ColumnType.LONG_TEXT:
        return (
          <TextArea
            title={column.title}
            placeholder={`Enter ${column.title.toLowerCase()}`}
            value={value || ''}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
          />
        );
        
      case ColumnType.NUMBER:
        return (
          <TextField
            title={column.title}
            placeholder={`Enter ${column.title.toLowerCase()}`}
            value={value?.toString() || ''}
            onChange={(val: string) => {
              const numValue = val === '' ? null : Number(val);
              onChange(numValue);
            }}
            // Using a regular text field since monday-ui doesn't have a number type
            disabled={disabled}
          />
        );
        
      case ColumnType.STATUS:
      case ColumnType.DROPDOWN:
        return (
          <Dropdown
            title={column.title}
            placeholder={`Select ${column.title.toLowerCase()}`}
            options={columnValues.map(option => ({
              value: option.id,
              label: option.value,
              labelColor: option.color
            }))}
            onChange={(option: { value: string }) => {
              // Format value for Monday.com API
              const selectedOption = columnValues.find(opt => opt.id === option.value);
              if (selectedOption) {
                onChange({
                  index: selectedOption.id,
                  post_id: selectedOption.id,
                  text: selectedOption.value
                });
              }
            }}
            value={value?.index || value?.post_id || ''}
            disabled={disabled || loading}
          />
        );
        
      case ColumnType.DATE:
        return (
          <div>
            <Text type={Text.types.TEXT1} weight={Text.weights.MEDIUM}>{column.title}</Text>
            <div style={{ marginTop: '8px' }}>
              <TextField
                placeholder={`YYYY-MM-DD`}
                value={value?.date || ''}
                onChange={(val: string) => {
                  // Format date for Monday.com API
                  const formattedDate = val;
                  onChange({
                    date: formattedDate
                  });
                }}
                disabled={disabled}
              />
              <Text type={Text.types.TEXT3} style={{ color: '#676879', marginTop: '4px' }}>
                Enter date in YYYY-MM-DD format
              </Text>
            </div>
          </div>
        );
        
      case ColumnType.CHECKBOX:
        return (
          <Checkbox
            label={column.title}
            checked={!!value?.checked && value.checked === "true"}
            onChange={(event) => {
              const checked = event.target.checked;
              onChange(checked ? { checked: "true" } : { checked: "false" });
            }}
            disabled={disabled}
          />
        );
        
      case ColumnType.COLOR_PICKER:
        return (
          <div>
            <Text type={Text.types.TEXT1} weight={Text.weights.MEDIUM}>{column.title}</Text>
            <div style={{ marginTop: '8px' }}>
              <TextField
                placeholder="Enter color (e.g., #FF0000)"
                value={value?.color || ''}
                onChange={(val: string) => onChange({ color: val })}
                disabled={disabled}
              />
              {value?.color && (
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: value.color,
                    borderRadius: '4px',
                    marginTop: '8px',
                    border: '1px solid #c4c4c4'
                  }}
                />
              )}
            </div>
          </div>
        );
        
      case ColumnType.PEOPLE:
        // Simplified people picker - in a real app, you'd have a more complex component
        return (
          <div>
            <Text type={Text.types.TEXT1} weight={Text.weights.MEDIUM}>{column.title}</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {value?.personsAndTeams?.map((person: any) => (
                <Avatar
                  key={person.id}
                  size={Avatar.sizes.MEDIUM}
                  src={person.photo_thumb || ''}
                  type={Avatar.types.IMG}
                  text={person.name}
                />
              ))}
              <Text type={Text.types.TEXT2} style={{ color: '#676879' }}>
                {!value?.personsAndTeams?.length && 'No people assigned'}
              </Text>
            </div>
            <Text type={Text.types.TEXT3} style={{ color: '#676879', marginTop: '4px' }}>
              People selection requires the Monday.com UI
            </Text>
          </div>
        );
        
      default:
        return (
          <Box padding={Box.paddings.SMALL} style={{ backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <Text type={Text.types.TEXT1} weight={Text.weights.MEDIUM}>{column.title}</Text>
            <Text type={Text.types.TEXT2} style={{ color: '#676879' }}>
              {`Column type "${column.type}" is not supported in this editor`}
            </Text>
          </Box>
        );
    }
  };

  return (
    <div className="column-value-editor">
      {renderEditor()}
    </div>
  );
};

export default ColumnValueEditor;