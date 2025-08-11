/**
 * Comprehensive testing utilities
 * Production-ready testing setup with best practices
 */

import React from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import userEvent from '@testing-library/user-event'

// Test query client with shorter timeouts for faster tests
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0
      },
      mutations: {
        retry: false
      }
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {}
    }
  })
}

// Test wrapper component that provides all necessary contexts
interface TestWrapperProps {
  children: React.ReactNode
  queryClient?: QueryClient
  initialTheme?: 'light' | 'dark' | 'system'
}

export function TestWrapper({
  children,
  queryClient = createTestQueryClient(),
  initialTheme = 'light'
}: TestWrapperProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme={initialTheme}
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

// Enhanced render function with all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  initialTheme?: 'light' | 'dark' | 'system'
  wrapper?: React.ComponentType<any>
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const { queryClient, initialTheme, wrapper, ...renderOptions } = options

  const Wrapper = wrapper || (({ children }: { children: React.ReactNode }) => (
    <TestWrapper queryClient={queryClient} initialTheme={initialTheme}>
      {children}
    </TestWrapper>
  ))

  const result = render(ui, { wrapper: Wrapper, ...renderOptions })
  const user = userEvent.setup()

  return { ...result, user }
}

// Mock data generators
export const mockData = {
  user: (overrides = {}) => ({
    id: '1',
    first_name: 'John',
    surname: 'Doe',
    email: 'john@example.com',
    role: 'admin' as const,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides
  }),

  project: (overrides = {}) => ({
    id: '1',
    name: 'Test Project',
    description: 'A test project',
    status: 'planning' as const,
    priority: 'medium' as const,
    budget: 10000,
    target_completion_date: '2024-12-31',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides
  }),

  task: (overrides = {}) => ({
    id: '1',
    title: 'Test Task',
    description: 'A test task',
    status: 'pending' as const,
    priority: 'medium' as const,
    due_date: '2024-12-31',
    project_id: '1',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides
  }),

  message: (overrides = {}) => ({
    id: '1',
    content: 'Test message',
    thread_id: '1',
    sender_id: '1',
    user_id: '1',
    created_at: '2024-01-01T00:00:00Z',
    user: mockData.user(),
    ...overrides
  }),

  thread: (overrides = {}) => ({
    id: '1',
    title: 'Test Thread',
    project_id: '1',
    created_by: '1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    participants_count: 2,
    unread_count: 0,
    priority: 'normal' as const,
    is_archived: false,
    ...overrides
  }),

  metrics: (overrides = {}) => ({
    activeProjects: 5,
    totalProjects: 10,
    myPendingTasks: 3,
    overdueTasks: 1,
    totalBudget: 100000,
    budgetSpent: 50000,
    unreadMessages: 2,
    activeThreads: 5,
    todaysAppointments: 2,
    upcomingAppointments: 5,
    complianceAlerts: 0,
    projectsOnHold: 1,
    ...overrides
  })
}

// API mocking utilities
export const mockApi = {
  // Mock successful response
  success: <T>(data: T, delay = 0) => {
    return new Promise<T>((resolve) => {
      setTimeout(() => resolve(data), delay)
    })
  },

  // Mock error response
  error: (message = 'API Error', status = 500, delay = 0) => {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(message))
      }, delay)
    })
  },

  // Mock loading state
  loading: (delay = 1000) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(null), delay)
    })
  }
}

// Custom test hooks
export const testHooks = {
  // Test hook that uses query
  useTestQuery: (key: string, data: any, options = {}) => {
    return {
      data,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      ...options
    }
  },

  // Test hook that uses mutation
  useTestMutation: (options = {}) => {
    return {
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: false,
      data: null,
      reset: jest.fn(),
      ...options
    }
  }
}

// Test assertions helpers
export const assertions = {
  // Assert element has accessible name
  toHaveAccessibleName: (element: HTMLElement, name: string) => {
    expect(element).toHaveAttribute('aria-label', name)
  },

  // Assert element is focusable
  toBeFocusable: (element: HTMLElement) => {
    expect(element).toHaveAttribute('tabindex', expect.not.stringMatching('-1'))
  },

  // Assert loading state
  toBeLoading: (element: HTMLElement) => {
    expect(element).toHaveAttribute('aria-busy', 'true')
  },

  // Assert error state
  toHaveError: (element: HTMLElement, message?: string) => {
    expect(element).toHaveAttribute('aria-invalid', 'true')
    if (message) {
      expect(element).toHaveAccessibleDescription(message)
    }
  }
}

// Test utilities for forms
export const formUtils = {
  // Fill form field
  fillField: async (user: ReturnType<typeof userEvent.setup>, field: HTMLElement, value: string) => {
    await user.clear(field)
    await user.type(field, value)
  },

  // Submit form
  submitForm: async (user: ReturnType<typeof userEvent.setup>, form: HTMLElement) => {
    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement
    if (submitButton) {
      await user.click(submitButton)
    } else {
      // Try to find any submit button
      const buttons = form.querySelectorAll('button')
      const submitBtn = Array.from(buttons).find(btn => 
        btn.textContent?.toLowerCase().includes('submit') ||
        btn.textContent?.toLowerCase().includes('save')
      )
      if (submitBtn) {
        await user.click(submitBtn)
      }
    }
  }
}

// Performance testing utilities
export const performanceUtils = {
  // Measure render time
  measureRender: async (renderFn: () => RenderResult) => {
    const start = performance.now()
    const result = renderFn()
    const end = performance.now()
    
    return {
      result,
      renderTime: end - start
    }
  },

  // Measure interaction time
  measureInteraction: async (interactionFn: () => Promise<void>) => {
    const start = performance.now()
    await interactionFn()
    const end = performance.now()
    
    return end - start
  },

  // Assert performance threshold
  assertPerformance: (actualTime: number, expectedTime: number, tolerance = 0.2) => {
    const maxTime = expectedTime * (1 + tolerance)
    expect(actualTime).toBeLessThanOrEqual(maxTime)
  }
}

// Accessibility testing utilities
export const a11yUtils = {
  // Check for ARIA labels
  checkAriaLabels: (container: HTMLElement) => {
    const interactiveElements = container.querySelectorAll(
      'button, input, select, textarea, [role="button"], [role="link"], [role="menuitem"]'
    )
    
    interactiveElements.forEach(element => {
      const hasLabel = element.hasAttribute('aria-label') || 
                      element.hasAttribute('aria-labelledby') ||
                      (element as HTMLInputElement).labels?.length > 0
      
      if (!hasLabel) {
        console.warn('Interactive element missing accessible label:', element)
      }
    })
  },

  // Check color contrast (simplified)
  checkColorContrast: (element: HTMLElement) => {
    const styles = window.getComputedStyle(element)
    const color = styles.color
    const backgroundColor = styles.backgroundColor
    
    // This is a simplified check - in real tests you'd use a proper contrast calculation
    expect(color).not.toBe(backgroundColor)
  },

  // Check keyboard navigation
  checkKeyboardNavigation: async (user: ReturnType<typeof userEvent.setup>, container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    
    // Test tab navigation
    for (let i = 0; i < focusableElements.length; i++) {
      await user.tab()
      expect(focusableElements[i]).toHaveFocus()
    }
  }
}

// Component testing templates
export const componentTests = {
  // Standard component test template
  testComponent: (Component: React.ComponentType<any>, props: any = {}) => {
    return {
      renders: () => {
        const { container } = renderWithProviders(<Component {...props} />)
        expect(container.firstChild).toBeInTheDocument()
      },
      
      isAccessible: () => {
        const { container } = renderWithProviders(<Component {...props} />)
        a11yUtils.checkAriaLabels(container)
      },
      
      handlesInteraction: async (interactionTest: (user: any) => Promise<void>) => {
        const { user } = renderWithProviders(<Component {...props} />)
        await interactionTest(user)
      }
    }
  }
}

// Export all utilities
export {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  fireEvent,
  act
} from '@testing-library/react'

export { userEvent }

// Jest custom matchers (if using Jest)
if (typeof expect !== 'undefined' && expect.extend) {
  expect.extend({
    toHaveAccessibleName: assertions.toHaveAccessibleName,
    toBeFocusable: assertions.toBeFocusable,
    toBeLoading: assertions.toBeLoading,
    toHaveError: assertions.toHaveError
  })
}