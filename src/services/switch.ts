/**
 * Represents a mini-app available in the switch section.
 */
export interface MiniApp {
  /**
   * The ID of the mini-app.
   */
  appId: string;
  /**
   * The name of the mini-app.
   */
  appName: string;
  /**
   * A description of the mini-app.
   */
  description: string;
  /**
   * URL for the icon of the mini-app.
   */
  iconUrl: string;
  /**
   * The URL to launch the mini-app.
   */
  launchUrl: string;
}

/**
 * Asynchronously retrieves a list of available mini-apps.
 *
 * @returns A promise that resolves to an array of MiniApp objects.
 */
export async function getMiniApps(): Promise<MiniApp[]> {
  // TODO: Implement this by calling an API.
  return [
    {
      appId: '1',
      appName: 'Travel App',
      description: 'Book flights and hotels.',
      iconUrl: 'https://example.com/travel.png',
      launchUrl: 'https://example.com/travel',
    },
    {
      appId: '2',
      appName: 'Shopping App',
      description: 'Shop for the latest fashion trends.',
      iconUrl: 'https://example.com/shopping.png',
      launchUrl: 'https://example.com/shopping',
    },
  ];
}
