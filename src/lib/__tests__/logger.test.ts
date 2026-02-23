import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger } from '../logger';

describe('createLogger', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should create a logger with info, warn, error, debug methods', () => {
        const log = createLogger('test');
        expect(typeof log.info).toBe('function');
        expect(typeof log.warn).toBe('function');
        expect(typeof log.error).toBe('function');
        expect(typeof log.debug).toBe('function');
    });

    it('info() should log with correct format', () => {
        const spy = vi.spyOn(console, 'info').mockImplementation(() => { });
        const log = createLogger('TestCtx');
        log.info('hello world');
        expect(spy).toHaveBeenCalledOnce();
        const msg = spy.mock.calls[0][0] as string;
        expect(msg).toContain('[TestCtx]');
        expect(msg).toContain('hello world');
        expect(msg).toContain('INFO');
    });

    it('error() should include error details', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const log = createLogger('ErrCtx');
        log.error('something broke', new Error('test error'));
        expect(spy).toHaveBeenCalledOnce();
        const msg = spy.mock.calls[0][0] as string;
        expect(msg).toContain('ERROR');
        expect(msg).toContain('test error');
    });

    it('warn() should accept metadata', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        const log = createLogger('WarnCtx');
        log.warn('slow query', { durationMs: 500 });
        expect(spy).toHaveBeenCalledOnce();
        const msg = spy.mock.calls[0][0] as string;
        expect(msg).toContain('500');
    });
});
