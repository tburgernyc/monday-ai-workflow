import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Icon,
  Tooltip,
  Loader,
  Dialog,
  DialogContentContainer,
  Search
} from 'monday-ui-react-core';
import {
  Workspace,
  Board,
  Add,
  Delete,
  Duplicate,
  Filter,
  Favorite,
  Heart,
  Share
} from 'monday-ui-react-core/icons';
import { useAuth } from '../Authentication/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';

interface ColumnSuggestion {
  title: string;
  type: string;
}

interface GroupSuggestion {
  title: string;
}

interface BoardSuggestion {
  name: string;
  description: string;
  columnSuggestions: ColumnSuggestion[];
  groupSuggestions: GroupSuggestion[];
}

interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  boardSuggestions: BoardSuggestion[];
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
  isPublic: boolean;
  isFavorite: boolean;
  usageCount: number;
  category: string;
}

interface TemplateGalleryProps {
  onSelectTemplate: (template: WorkspaceTemplate) => void;
  onCreateNew: () => void;
}

const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onSelectTemplate, onCreateNew }) => {
  const { token } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  
  const [templates, setTemplates] = useState<WorkspaceTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<WorkspaceTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [templateToDelete, setTemplateToDelete] = useState<WorkspaceTemplate | null>(null);
  
  // Mock categories
  const categories = [
    'Project Management',
    'Software Development',
    'Marketing',
    'Sales',
    'HR',
    'Operations',
    'Creative',
    'Other'
  ];
  
  // Mock templates data
  useEffect(() => {
    // Simulate API call to fetch templates
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        
        // Mock data
        const mockTemplates: WorkspaceTemplate[] = [
          {
            id: '1',
            name: 'Agile Development',
            description: 'Complete workspace setup for agile software development teams with sprint planning, backlog, and bug tracking.',
            boardSuggestions: [
              {
                name: 'Sprint Planning',
                description: 'Plan and track sprint progress',
                columnSuggestions: [
                  { title: 'Status', type: 'status' },
                  { title: 'Priority', type: 'dropdown' },
                  { title: 'Story Points', type: 'number' }
                ],
                groupSuggestions: [
                  { title: 'Backlog' },
                  { title: 'Current Sprint' },
                  { title: 'In Progress' },
                  { title: 'Done' }
                ]
              },
              {
                name: 'Bug Tracking',
                description: 'Track and manage bugs',
                columnSuggestions: [
                  { title: 'Status', type: 'status' },
                  { title: 'Severity', type: 'dropdown' },
                  { title: 'Reported By', type: 'people' }
                ],
                groupSuggestions: [
                  { title: 'New' },
                  { title: 'In Progress' },
                  { title: 'Testing' },
                  { title: 'Resolved' }
                ]
              }
            ],
            createdAt: '2025-03-15T10:30:00Z',
            createdBy: {
              id: 'user1',
              name: 'John Developer'
            },
            isPublic: true,
            isFavorite: true,
            usageCount: 245,
            category: 'Software Development'
          },
          {
            id: '2',
            name: 'Marketing Campaign',
            description: 'Workspace for planning and executing marketing campaigns with content calendar, asset management, and performance tracking.',
            boardSuggestions: [
              {
                name: 'Content Calendar',
                description: 'Plan and schedule content',
                columnSuggestions: [
                  { title: 'Status', type: 'status' },
                  { title: 'Channel', type: 'dropdown' },
                  { title: 'Publish Date', type: 'date' }
                ],
                groupSuggestions: [
                  { title: 'Planning' },
                  { title: 'In Progress' },
                  { title: 'Review' },
                  { title: 'Published' }
                ]
              },
              {
                name: 'Campaign Performance',
                description: 'Track campaign metrics',
                columnSuggestions: [
                  { title: 'Status', type: 'status' },
                  { title: 'Impressions', type: 'number' },
                  { title: 'Clicks', type: 'number' },
                  { title: 'Conversions', type: 'number' }
                ],
                groupSuggestions: [
                  { title: 'Social Media' },
                  { title: 'Email' },
                  { title: 'Paid Ads' },
                  { title: 'Website' }
                ]
              }
            ],
            createdAt: '2025-03-20T14:15:00Z',
            createdBy: {
              id: 'user2',
              name: 'Sarah Marketer'
            },
            isPublic: true,
            isFavorite: false,
            usageCount: 187,
            category: 'Marketing'
          },
          {
            id: '3',
            name: 'Sales Pipeline',
            description: 'Complete sales pipeline management with lead tracking, opportunity management, and customer onboarding.',
            boardSuggestions: [
              {
                name: 'Lead Management',
                description: 'Track and qualify leads',
                columnSuggestions: [
                  { title: 'Status', type: 'status' },
                  { title: 'Source', type: 'dropdown' },
                  { title: 'Value', type: 'number' }
                ],
                groupSuggestions: [
                  { title: 'New Leads' },
                  { title: 'Contacted' },
                  { title: 'Qualified' },
                  { title: 'Disqualified' }
                ]
              },
              {
                name: 'Opportunities',
                description: 'Manage sales opportunities',
                columnSuggestions: [
                  { title: 'Status', type: 'status' },
                  { title: 'Deal Value', type: 'number' },
                  { title: 'Close Date', type: 'date' }
                ],
                groupSuggestions: [
                  { title: 'Discovery' },
                  { title: 'Proposal' },
                  { title: 'Negotiation' },
                  { title: 'Closed Won' },
                  { title: 'Closed Lost' }
                ]
              }
            ],
            createdAt: '2025-03-25T09:45:00Z',
            createdBy: {
              id: 'user3',
              name: 'Mike Sales'
            },
            isPublic: true,
            isFavorite: true,
            usageCount: 156,
            category: 'Sales'
          }
        ];
        
        setTemplates(mockTemplates);
        setFilteredTemplates(mockTemplates);
        
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTemplates();
  }, []);
  
  // Filter templates based on search query, category, and favorites
  useEffect(() => {
    let filtered = [...templates];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(query) || 
        template.description.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }
    
    // Apply favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(template => template.isFavorite);
    }
    
    setFilteredTemplates(filtered);
  }, [templates, searchQuery, selectedCategory, showFavoritesOnly]);
  
  // Toggle favorite status
  const toggleFavorite = (templateId: string) => {
    setTemplates(prevTemplates => 
      prevTemplates.map(template => 
        template.id === templateId 
          ? { ...template, isFavorite: !template.isFavorite } 
          : template
      )
    );
  };
  
  // Delete template
  const deleteTemplate = () => {
    if (!templateToDelete) return;
    
    setTemplates(prevTemplates => 
      prevTemplates.filter(template => template.id !== templateToDelete.id)
    );
    
    setTemplateToDelete(null);
  };
  
  // Duplicate template
  const duplicateTemplate = (template: WorkspaceTemplate) => {
    const duplicatedTemplate: WorkspaceTemplate = {
      ...template,
      id: `${template.id}-copy-${Date.now()}`,
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
      createdBy: {
        id: 'current-user',
        name: 'Current User'
      },
      isFavorite: false
    };
    
    setTemplates(prevTemplates => [...prevTemplates, duplicatedTemplate]);
  };
  
  // Render template card
  const renderTemplateCard = (template: WorkspaceTemplate) => {
    return (
      <div
        key={template.id}
        className="template-card"
        style={{
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          overflow: 'hidden',
          transition: 'transform 0.2s, box-shadow 0.2s',
          cursor: 'pointer',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={() => onSelectTemplate(template)}
      >
        {/* Card header */}
        <div style={{ 
          padding: '16px', 
          backgroundColor: 'var(--primary-selected-color)',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon icon={Workspace} />
              <Text style={{ fontWeight: 'bold', fontSize: '16px' }}>{template.name}</Text>
            </div>
            <div>
              <Button 
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(template.id);
                }}
              >
                <Icon icon={template.isFavorite ? Favorite : Heart} />
              </Button>
            </div>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Text style={{ fontSize: '14px', color: 'var(--primary-text-color)' }}>
              {template.category}
            </Text>
          </div>
        </div>
        
        {/* Card body */}
        <div style={{ padding: '16px', flex: 1 }}>
          <Text style={{ marginBottom: '16px' }}>
            {template.description}
          </Text>
          
          <div style={{ marginBottom: '16px' }}>
            <Text style={{ fontWeight: 'bold', marginBottom: '8px' }}>Boards:</Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {template.boardSuggestions.map((board, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon icon={Board} />
                  <Text>{board.name}</Text>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-color-secondary)', fontSize: '14px' }}>
            <Text>Used {template.usageCount} times</Text>
          </div>
        </div>
        
        {/* Card footer */}
        <div style={{ 
          padding: '12px 16px', 
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--primary-background-color)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setTemplateToDelete(template);
              }}
            >
              <Icon icon={Delete} />
            </Button>
            
            <Button 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                duplicateTemplate(template);
              }}
            >
              <Icon icon={Duplicate} />
            </Button>
            
            <Button 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                // Share functionality would be implemented here
                alert(`Sharing template: ${template.name}`);
              }}
            >
              <Icon icon={Share} />
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Box className="template-gallery">
      <div style={{ marginBottom: '24px' }}>
        <Heading value="Workspace Templates" />
        <Text style={{ marginTop: '8px', color: 'var(--text-color-secondary)' }}>
          Choose from pre-built workspace templates or create your own from scratch.
        </Text>
      </div>
      
      {/* Search and filters */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        gap: '16px',
        marginBottom: '24px',
        alignItems: isMobile ? 'stretch' : 'center'
      }}>
        <div style={{ flex: 1 }}>
          <Search
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(value) => setSearchQuery(value as string)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <div>
            <Button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              leftIcon={showFavoritesOnly ? Favorite : Heart}
            >
              {showFavoritesOnly ? 'All Templates' : 'Favorites'}
            </Button>
          </div>
          
          <div>
            <Button
              onClick={onCreateNew}
              leftIcon={Add}
            >
              Create New
            </Button>
          </div>
        </div>
      </div>
      
      {/* Category filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <Button
          size="small"
          onClick={() => setSelectedCategory(null)}
          style={{ 
            backgroundColor: selectedCategory === null ? 'var(--primary-color)' : undefined,
            color: selectedCategory === null ? 'white' : undefined
          }}
        >
          All
        </Button>
        
        {categories.map(category => (
          <Button
            key={category}
            size="small"
            onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
            style={{ 
              backgroundColor: category === selectedCategory ? 'var(--primary-color)' : undefined,
              color: category === selectedCategory ? 'white' : undefined
            }}
          >
            {category}
          </Button>
        ))}
      </div>
      
      {/* Templates grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <Loader />
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--negative-color)' }}>
          <Text>{error}</Text>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Text>No templates found matching your criteria.</Text>
          <Button onClick={() => {
            setSearchQuery('');
            setSelectedCategory(null);
            setShowFavoritesOnly(false);
          }} style={{ marginTop: '16px' }}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
          gap: '24px' 
        }}>
          {filteredTemplates.map(template => renderTemplateCard(template))}
        </div>
      )}
      
      {/* Delete confirmation dialog */}
      {templateToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90%',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ padding: '24px' }}>
              <Heading value="Delete Template" style={{ marginBottom: '16px' }} />
              <Text style={{ marginBottom: '24px' }}>
                Are you sure you want to delete the template "{templateToDelete.name}"? This action cannot be undone.
              </Text>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                <Button onClick={() => setTemplateToDelete(null)}>
                  Cancel
                </Button>
                <Button onClick={deleteTemplate}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Box>
  );
};

export default TemplateGallery;