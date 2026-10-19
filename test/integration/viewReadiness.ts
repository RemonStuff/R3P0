export async function openViewWhenReady<View>(
  focus: () => PromiseLike<unknown>,
  read: () => View | undefined,
): Promise<View> {
  await focus();
  const view = read();
  if (view === undefined) {
    throw new Error(
      "Opening the view did not activate the extension and resolve its provider within 5000 ms",
    );
  }
  return view;
}
