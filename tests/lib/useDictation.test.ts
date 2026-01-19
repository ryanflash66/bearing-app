/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useDictation } from "@/lib/useDictation";

describe("useDictation", () => {
  let mockSpeechRecognition: any;
  let mockStart: jest.Mock;
  let mockStop: jest.Mock;
  let instances: any[] = [];

  beforeEach(() => {
    mockStart = jest.fn();
    mockStop = jest.fn();
    instances = [];

    mockSpeechRecognition = jest.fn().mockImplementation(function (this: any) {
        const instance = {
            start: mockStart,
            stop: mockStop,
            abort: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            onresult: null,
            onstart: null,
            onend: null,
            onerror: null,
            continuous: false,
            interimResults: false,
            lang: 'en-US'
        };
        instances.push(instance);
        return instance;
    });

    (window as any).SpeechRecognition = mockSpeechRecognition;
    (window as any).webkitSpeechRecognition = mockSpeechRecognition;
  });

  afterEach(() => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
    jest.clearAllMocks();
  });

  it("should initialize with not listening", () => {
    const { result } = renderHook(() => useDictation({ onResult: jest.fn() }));
    expect(result.current.isListening).toBe(false);
    expect(result.current.isSupported).toBe(true);
  });

  it("should handle lack of browser support", () => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    const { result } = renderHook(() => useDictation({ onResult: jest.fn() }));
    expect(result.current.isSupported).toBe(false);
  });

  it("should start dictation", () => {
    const { result } = renderHook(() => useDictation({ onResult: jest.fn() }));

    act(() => {
      result.current.start();
    });

    expect(mockStart).toHaveBeenCalled();
  });

  it("should update state on start event", () => {
      const { result } = renderHook(() => useDictation({ onResult: jest.fn() }));
      
      act(() => {
          result.current.start();
      });
      
      // Simulate onstart
      act(() => {
          const instance = instances[0];
          if (instance && instance.onstart) {
              instance.onstart();
          }
      });

      expect(result.current.isListening).toBe(true);
  });

  it("should handle dictation results", () => {
    const onResult = jest.fn();
    const { result } = renderHook(() => useDictation({ onResult }));
    
    act(() => {
      result.current.start();
    });

    // Simulate result event
    act(() => {
        const instance = instances[0];
        if (instance && instance.onresult) {
            const resultItem = [{ transcript: "Hello world" }];
            (resultItem as any).isFinal = true;
            
            const mockEvent = {
                resultIndex: 0,
                results: [resultItem]
            };
            // Add required length property and indexing to mimic SpeechRecognitionResultList
            Object.defineProperty(mockEvent.results, 'length', { value: 1 });
            instance.onresult(mockEvent);
        }
    });

    expect(onResult).toHaveBeenCalledWith("Hello world", true);
  });

  it("should handle interim results", () => {
    const onResult = jest.fn();
    const { result } = renderHook(() => useDictation({ onResult }));
    
    act(() => {
      result.current.start();
    });

    // Simulate interim result
    act(() => {
        const instance = instances[0];
        if (instance && instance.onresult) {
            const mockEvent = {
                resultIndex: 0,
                results: [
                    [{ transcript: "Hello", isFinal: false }]
                ]
            };
            Object.defineProperty(mockEvent.results, 'length', { value: 1 });
            instance.onresult(mockEvent);
        }
    });

    expect(onResult).toHaveBeenCalledWith("Hello", false);
  });

  it("should stop dictation", () => {
    const { result } = renderHook(() => useDictation({ onResult: jest.fn() }));

    // Start first
    act(() => {
      result.current.start();
    });
    
    // Simulate onstart to update state
    act(() => {
         const instance = instances[0];
         if (instance && instance.onstart) {
             instance.onstart();
         }
    });

    expect(result.current.isListening).toBe(true);

    // Now stop
    act(() => {
      result.current.stop();
    });

    expect(mockStop).toHaveBeenCalled();
  });

  it("should toggle dictation", () => {
    const { result } = renderHook(() => useDictation({ onResult: jest.fn() }));

    // Toggle on
    act(() => {
        result.current.toggle();
    });
    expect(mockStart).toHaveBeenCalled();

    // Simulate onstart
    act(() => {
        const instance = instances[0];
        if (instance && instance.onstart) {
            instance.onstart();
        }
    });
    expect(result.current.isListening).toBe(true);

    // Toggle off
    act(() => {
        result.current.toggle();
    });
    expect(mockStop).toHaveBeenCalled();
  });

  it("should handle errors", () => {
    const { result } = renderHook(() => useDictation({ onResult: jest.fn() }));
    
    act(() => {
      result.current.start();
    });

    act(() => {
        const instance = instances[0];
        if (instance && instance.onerror) {
            instance.onerror({ error: "not-allowed" });
        }
    });

    expect(result.current.error).toBe("not-allowed");
    expect(result.current.isListening).toBe(false);
  });
});