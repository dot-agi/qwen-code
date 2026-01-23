/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BugMessageHandler } from './BugMessageHandler.js';

// Mock vscode
vi.mock('vscode', () => ({
  version: '1.85.0',
  Uri: {
    parse: vi.fn((url: string) => ({ toString: () => url })),
  },
  env: {
    openExternal: vi.fn().mockResolvedValue(true),
  },
  extensions: {
    getExtension: vi.fn((id: string) => {
      if (id === 'qwenlm.qwen-code-vscode-ide-companion') {
        return { packageJSON: { version: '0.1.0' } };
      }
      return undefined;
    }),
  },
}));

describe('BugMessageHandler', () => {
  let handler: BugMessageHandler;
  let mockSendToWebView: ReturnType<typeof vi.fn>;
  let mockAgentManager: unknown;
  let mockConversationStore: unknown;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSendToWebView = vi.fn();
    mockAgentManager = {};
    mockConversationStore = {};

    handler = new BugMessageHandler(
      mockAgentManager as never,
      mockConversationStore as never,
      null,
      mockSendToWebView,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('canHandle', () => {
    it('should return true for bug message type', () => {
      expect(handler.canHandle('bug')).toBe(true);
    });

    it('should return false for other message types', () => {
      expect(handler.canHandle('login')).toBe(false);
      expect(handler.canHandle('sendMessage')).toBe(false);
      expect(handler.canHandle('other')).toBe(false);
    });
  });

  describe('handle', () => {
    it('should open bug report URL for bug message type', async () => {
      const vscode = await import('vscode');

      await handler.handle({ type: 'bug' });

      expect(vscode.Uri.parse).toHaveBeenCalled();
      expect(vscode.env.openExternal).toHaveBeenCalled();
      expect(mockSendToWebView).toHaveBeenCalledWith({
        type: 'bugReportOpened',
        data: {
          message: 'Bug report page opened in your browser',
        },
      });
    });

    it('should include description in URL when provided', async () => {
      const vscode = await import('vscode');

      await handler.handle({
        type: 'bug',
        data: { description: 'Test bug description' },
      });

      const urlCall = vi.mocked(vscode.Uri.parse).mock.calls[0][0];
      expect(urlCall).toContain('title=Test+bug+description');
    });

    it('should send error message when openExternal fails', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.env.openExternal).mockRejectedValueOnce(
        new Error('Browser not found'),
      );

      await handler.handle({ type: 'bug' });

      expect(mockSendToWebView).toHaveBeenCalledWith({
        type: 'bugReportError',
        data: {
          message: 'Failed to open bug report: Browser not found',
        },
      });
    });

    it('should log warning for unknown message types', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await handler.handle({ type: 'unknown' });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[BugMessageHandler] Unknown message type:',
        'unknown',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('buildBugReportUrl', () => {
    it('should include system information in URL', async () => {
      const vscode = await import('vscode');

      await handler.handle({ type: 'bug' });

      const urlCall = vi.mocked(vscode.Uri.parse).mock.calls[0][0];
      expect(urlCall).toContain('github.com/QwenLM/qwen-code/issues/new');
      expect(urlCall).toContain('template=bug_report.yml');
      expect(urlCall).toContain('info=');
    });

    it('should include extension version in system info', async () => {
      const vscode = await import('vscode');

      await handler.handle({ type: 'bug' });

      const urlCall = vi.mocked(vscode.Uri.parse).mock.calls[0][0];
      expect(urlCall).toContain('Extension+Version');
      expect(urlCall).toContain('0.1.0');
    });

    it('should include VS Code version in system info', async () => {
      const vscode = await import('vscode');

      await handler.handle({ type: 'bug' });

      const urlCall = vi.mocked(vscode.Uri.parse).mock.calls[0][0];
      expect(urlCall).toContain('VS+Code+Version');
      expect(urlCall).toContain('1.85.0');
    });
  });
});
