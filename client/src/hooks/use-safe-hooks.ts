import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { UseFormReturn, FieldValues, DefaultValues, SubmitHandler, UseFormProps } from 'react-hook-form';

/**
 * Custom hook for safely creating React useState hooks
 * This ensures that hooks are always called in the same order
 * @param initialState The initial state value
 * @returns A state tuple with value and setter
 */
export function useSafeState<T>(initialState: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialState);
  return [state, setState];
}

/**
 * Custom hook for safely creating multiple state hooks with consistent naming
 * @param initialStates Object with initial state values
 * @returns Object with state tuples
 */
/**
 * DO NOT USE THIS HOOK DIRECTLY - it violates React's rules of hooks.
 * This was causing "Rendered more hooks than during the previous render" errors.
 * Instead, create individual useSafeState hooks for each state value.
 */
export function useSafeStates<T extends Record<string, any>>(initialStates: T): 
  { [K in keyof T]: [T[K], React.Dispatch<React.SetStateAction<T[K]>>] } {
  // This is an anti-pattern - kept for reference but should not be used
  console.warn('useSafeStates is deprecated due to React hooks rules violation');
  
  const result = {} as { [K in keyof T]: [T[K], React.Dispatch<React.SetStateAction<T[K]>>] };
  Object.keys(initialStates).forEach(key => {
    result[key as keyof T] = [initialStates[key], () => {}] as [T[typeof key], React.Dispatch<React.SetStateAction<T[typeof key]>>];
  });
  
  return result;
}

/**
 * Custom hook for safely creating a form with react-hook-form
 * Ensures proper initialization of the form hook
 * @param options Form options
 * @returns The form instance
 */
export function useSafeForm<TFieldValues extends FieldValues = FieldValues, TContext = any>(
  options: UseFormProps<TFieldValues, TContext>
): UseFormReturn<TFieldValues, TContext> {
  // Create the form hook always in the same place
  return useForm<TFieldValues, TContext>(options);
}

/**
 * Custom hook for safely running effects
 * @param effect Effect callback
 * @param deps Dependencies array
 */
export function useSafeEffect(effect: React.EffectCallback, deps?: React.DependencyList): void {
  useEffect(effect, deps);
}

/**
 * Custom hook for safely creating callbacks
 * @param callback The callback function
 * @param deps Dependencies array
 * @returns Memoized callback
 */
export function useSafeCallback<T extends (...args: any[]) => any>(
  callback: T, 
  deps: React.DependencyList
): T {
  return useCallback(callback, deps);
}

/**
 * Custom hook for safely creating memoized values
 * @param factory Factory function that creates the value
 * @param deps Dependencies array
 * @returns Memoized value
 */
export function useSafeMemo<T>(factory: () => T, deps: React.DependencyList): T {
  return useMemo(factory, deps);
}

/**
 * Custom hook for safely managing dialog state
 * @param initialState Initial open state (default: false)
 * @returns Dialog state and handlers
 */
export function useSafeDialog(initialState = false): {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
} {
  const [isOpen, setIsOpen] = useState(initialState);
  
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  
  return { isOpen, open, close, toggle, setOpen: setIsOpen };
}

/**
 * Custom hook for safely tracking previous value
 * @param value The value to track
 * @returns The previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

/**
 * Custom hook for safely controlling form submission
 * @param onSubmit Submit handler function
 * @returns Object with submission state and handler function
 */
export function useSafeSubmit<T extends FieldValues>(
  onSubmit: SubmitHandler<T>
): {
  isSubmitting: boolean;
  handleSubmit: SubmitHandler<T>;
} {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = useCallback(async (data: T) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit]);
  
  return { isSubmitting, handleSubmit };
}