export async function openViewWhenReady<View>(
  focus: () => PromiseLike<unknown>,
  read: () => View | undefined,
): Promise<View> {
  await focus();
  const deadline = Date.now() + 5_000;
  for (;;) {
    const view = read();
    if (view !== undefined) return view;
    if (Date.now() >= deadline) {
      throw new Error(
        "Opening the view did not activate the extension and resolve its provider within 5000 ms",
      );
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
}
