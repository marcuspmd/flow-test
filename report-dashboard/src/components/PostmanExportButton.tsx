import React from 'react';

interface Suite {
  suite_name: string;
  file_path: string;
  base_url?: string;
  steps: Array<{
    name: string;
    request: {
      method: string;
      url: string;
      headers?: Record<string, string>;
      body?: any;
      params?: Record<string, string>;
    };
  }>;
}

interface PostmanExportButtonProps {
  suite: Suite;
  className?: string;
}

export const PostmanExportButton: React.FC<PostmanExportButtonProps> = ({
  suite,
  className = "btn btn-outline btn-sm"
}) => {
  const exportToPostman = () => {
    const postmanCollection = {
      info: {
        name: suite.suite_name,
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        description: `Exported from Flow Test suite: ${suite.file_path}`
      },
      item: suite.steps.map(step => ({
        name: step.name,
        request: {
          method: step.request.method,
          url: {
            raw: step.request.url.startsWith('http')
              ? step.request.url
              : `${suite.base_url || ''}${step.request.url}`,
            ...(step.request.params && {
              query: Object.entries(step.request.params).map(([key, value]) => ({
                key,
                value: String(value)
              }))
            })
          },
          ...(step.request.headers && {
            header: Object.entries(step.request.headers).map(([key, value]) => ({
              key,
              value: String(value)
            }))
          }),
          ...(step.request.body && {
            body: {
              mode: "raw",
              raw: JSON.stringify(step.request.body, null, 2),
              options: {
                raw: {
                  language: "json"
                }
              }
            }
          })
        },
        response: []
      }))
    };

    const blob = new Blob([JSON.stringify(postmanCollection, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${suite.suite_name.replace(/[^a-zA-Z0-9]/g, '_')}.postman_collection.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportToPostman}
      className={className}
      title={`Export ${suite.suite_name} to Postman collection`}
    >
      Export Postman
    </button>
  );
};