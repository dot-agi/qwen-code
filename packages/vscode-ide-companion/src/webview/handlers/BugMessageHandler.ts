/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import * as vscode from 'vscode';
import { BaseMessageHandler } from './BaseMessageHandler.js';

/**
 * Bug report message handler
 * Handles bug report submission from the webview
 */
export class BugMessageHandler extends BaseMessageHandler {
  canHandle(messageType: string): boolean {
    return ['bug'].includes(messageType);
  }

  async handle(message: { type: string; data?: unknown }): Promise<void> {
    switch (message.type) {
      case 'bug':
        await this.handleBugReport(message.data);
        break;

      default:
        console.warn('[BugMessageHandler] Unknown message type:', message.type);
        break;
    }
  }

  /**
   * Handle bug report request
   * Opens the GitHub issue page with pre-filled system information
   */
  private async handleBugReport(data?: unknown): Promise<void> {
    try {
      console.log('[BugMessageHandler] Bug report requested');

      // Extract description from data if provided
      const description =
        data && typeof data === 'object' && 'description' in data
          ? String((data as { description: unknown }).description)
          : '';

      // Gather system information
      const systemInfo = this.getSystemInfo();

      // Build the bug report URL
      const bugReportUrl = this.buildBugReportUrl(description, systemInfo);

      console.log('[BugMessageHandler] Opening bug report URL');

      // Open the URL in the default browser
      const uri = vscode.Uri.parse(bugReportUrl);
      await vscode.env.openExternal(uri);

      // Notify webview that the bug report was opened
      this.sendToWebView({
        type: 'bugReportOpened',
        data: {
          message: 'Bug report page opened in your browser',
        },
      });
    } catch (error) {
      console.error('[BugMessageHandler] Failed to open bug report:', error);
      this.sendToWebView({
        type: 'bugReportError',
        data: {
          message: `Failed to open bug report: ${error instanceof Error ? error.message : String(error)}`,
        },
      });
    }
  }

  /**
   * Gather system information for the bug report
   */
  private getSystemInfo(): string {
    const info: string[] = [];

    // VS Code version
    info.push(`VS Code Version: ${vscode.version}`);

    // Extension version (from package.json)
    const extension = vscode.extensions.getExtension(
      'qwenlm.qwen-code-vscode-ide-companion',
    );
    if (extension) {
      info.push(`Extension Version: ${extension.packageJSON.version}`);
    }

    // Platform information
    info.push(`Platform: ${process.platform}`);
    info.push(`Architecture: ${process.arch}`);

    // Node version
    info.push(`Node Version: ${process.version}`);

    return info.join('\n');
  }

  /**
   * Build the bug report URL with pre-filled information
   */
  private buildBugReportUrl(description: string, systemInfo: string): string {
    const baseUrl =
      'https://github.com/QwenLM/qwen-code/issues/new?template=bug_report.yml';

    const params = new URLSearchParams();

    if (description) {
      params.set('title', description);
    }

    params.set('info', `\n${systemInfo}\n`);

    return `${baseUrl}&${params.toString()}`;
  }
}
