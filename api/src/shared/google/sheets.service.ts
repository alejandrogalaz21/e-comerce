// src/shared/google/sheets.service.ts
import { Injectable } from '@nestjs/common'
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import { sheets_v4 } from 'googleapis/build/src/apis/sheets'

@Injectable()
export class SheetsService {
  /**
   * Authenticate with Google Sheets API using service account credentials.
   * @param client_email Service account client email
   * @param private_key Service account private key
   * @returns Authenticated JWT client
   */
  async authenticateGoogleSheets(
    client_email: string,
    private_key: string
  ): Promise<JWT> {
    const auth = new google.auth.JWT({
      email: client_email,
      key: private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    })
    await auth.authorize()
    return auth
  }

  /**
   * Save expenses to Google Sheets.
   * @param auth Authenticated JWT client
   * @param spreadsheetId ID of the Google Sheets spreadsheet
   * @param range Range in the spreadsheet to insert data
   * @param values Data to be inserted
   * @returns Response from the Sheets API
   */
  async saveExpensesToSheet(
    auth: JWT,
    spreadsheetId: string,
    range: string,
    values: any[][]
  ): Promise<sheets_v4.Schema$AppendValuesResponse> {
    // Remove single quote from date string
    values.forEach(row => {
      if (row[5] && typeof row[5] === 'string') {
        row[5] = row[5].replace(/^'/, '')
      }
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const request = {
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values
      }
    }
    const response = await sheets.spreadsheets.values.append(request)
    return response.data
  }
}
