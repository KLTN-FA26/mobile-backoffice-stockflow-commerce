import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { useState } from "react";
import { AccessibilityInfo, Text, TextInput } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { AUTH_UI } from "@/constants/auth";
import { MOBILE_LABELS } from "@/constants/mobile";

import { ApiError } from "@/lib/api/error";
import { rememberRetryAfter } from "@/lib/api/retry-after";
import { bootstrapSession, reauthenticate, signIn, signOut } from "@/lib/auth/auth-session";
import { useAuthStore } from "@/lib/auth/auth-store";

import { __userDismissSheets } from "@/test/mocks/gorhom-bottom-sheet";
import { renderWithProviders } from "@/test/render";

import { AuthGate } from "../AuthGate";
import { ConfigGate } from "../ConfigErrorScreen";
import { LoginForm } from "../LoginForm";
import { PasswordField } from "../PasswordField";
import { ReloginSheet } from "../ReloginSheet";
import { SessionExpiryBanner } from "../SessionExpiryBanner";

import type { AuthUser } from "@/lib/auth/auth-store";

jest.mock("@/lib/auth/auth-session");

const signInMock = jest.mocked(signIn);
const reauthenticateMock = jest.mocked(reauthenticate);
const signOutMock = jest.mocked(signOut);
const bootstrapMock = jest.mocked(bootstrapSession);

const MINUTE_MS = 60_000;
const ALICE: AuthUser = {
  userId: "u-alice",
  username: "alice",
  email: "alice@stockflow.vn",
  fullName: "Alice",
  status: "ACTIVE",
  roles: [],
  lastLoginAt: null,
};
const WINDOW_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

const submitButton = () => screen.getByRole("button", { name: MOBILE_LABELS.login.submit });
const signOutButton = () => screen.getByRole("button", { name: MOBILE_LABELS.relogin.signOut });

/** A promise the test settles by hand, to hold a request in flight. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

async function fillCredentials(
  user: ReturnType<typeof userEvent.setup>,
  username: string,
  password: string,
) {
  await user.type(screen.getByLabelText(MOBILE_LABELS.login.username), username);
  await user.type(screen.getByLabelText(MOBILE_LABELS.login.password), password);
}

/** A screen with unsaved work: what the re-login sheet must leave alone. */
function DraftScreen() {
  const [draft, setDraft] = useState("");
  return <TextInput accessibilityLabel="Ghi chú" value={draft} onChangeText={setDraft} />;
}

beforeEach(() => {
  signInMock.mockReset().mockResolvedValue(undefined);
  reauthenticateMock.mockReset().mockResolvedValue("same-user");
  signOutMock.mockReset().mockResolvedValue(undefined);
  bootstrapMock.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("ConfigGate", () => {
  it("config error screen when api url missing", async () => {
    await render(
      <ConfigGate config={{ ok: false, reason: "missing" }}>
        <Text>app</Text>
      </ConfigGate>,
    );

    expect(screen.getByText(MOBILE_LABELS.config.title)).toBeOnTheScreen();
    expect(screen.getByText(MOBILE_LABELS.config.description)).toBeOnTheScreen();
    expect(screen.queryByText("app")).toBeNull();
  });

  it("config error screen when the api url is not an http(s) url", async () => {
    await render(
      <ConfigGate config={{ ok: false, reason: "invalid" }}>
        <Text>app</Text>
      </ConfigGate>,
    );

    expect(screen.getByText(MOBILE_LABELS.config.title)).toBeOnTheScreen();
    expect(screen.queryByText("app")).toBeNull();
  });

  it("renders the app when the api url is set", async () => {
    await render(
      <ConfigGate config={{ ok: true, apiUrl: "https://api.test/api/v1" }}>
        <Text>app</Text>
      </ConfigGate>,
    );

    expect(screen.getByText("app")).toBeOnTheScreen();
    expect(screen.queryByText(MOBILE_LABELS.config.title)).toBeNull();
  });
});

describe("LoginForm", () => {
  it("login submits trimmed username and navigates", async () => {
    const onSignedIn = jest.fn();
    const user = userEvent.setup();
    await renderWithProviders(<LoginForm onSignedIn={onSignedIn} />);

    await fillCredentials(user, "  alice  ", "s3cret");
    await user.press(submitButton());

    expect(signInMock).toHaveBeenCalledTimes(1);
    expect(signInMock).toHaveBeenCalledWith({ username: "alice", password: "s3cret" });
    await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
  });

  it("keeps submit disabled until the schema accepts both fields", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<LoginForm onSignedIn={jest.fn()} />);

    expect(submitButton()).toBeDisabled();

    await user.type(screen.getByLabelText(MOBILE_LABELS.login.username), "   ");
    await user.type(screen.getByLabelText(MOBILE_LABELS.login.password), "s3cret");
    // A username of spaces is empty once trimmed (loginRequestSchema).
    expect(submitButton()).toBeDisabled();

    await user.type(screen.getByLabelText(MOBILE_LABELS.login.username), "alice");
    expect(submitButton()).toBeEnabled();

    await user.press(screen.getByRole("togglebutton", { name: MOBILE_LABELS.login.showPassword }));
    expect(screen.getByLabelText(MOBILE_LABELS.login.password)).toHaveProp(
      "secureTextEntry",
      false,
    );
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("double tap sends one login request", async () => {
    signInMock.mockReturnValue(deferred<undefined>().promise);
    const user = userEvent.setup();
    await renderWithProviders(<LoginForm onSignedIn={jest.fn()} />);
    await fillCredentials(user, "alice", "s3cret");

    // Two taps in one frame, before React re-renders: the second lands while the button still looks
    // enabled, so only the form's own guard can stop it. userEvent and fireEvent both re-render
    // between taps, so the taps go through the Pressable's click handler (the path an
    // accessibility activation takes), both inside one act().
    const button = submitButton();
    const click: unknown = button.props.onClick;
    if (typeof click !== "function") throw new Error("the submit button takes no clicks");
    const tap = () => click({ nativeEvent: {}, target: button, currentTarget: button });
    await act(async () => {
      tap();
      tap();
    });

    await waitFor(() => expect(submitButton()).toBeDisabled());
    expect(signInMock).toHaveBeenCalledTimes(1);
  });

  it("wrong password shows UNAUTHORIZED copy", async () => {
    signInMock.mockRejectedValue(new ApiError(401, "UNAUTHORIZED", "Bad credentials"));
    const onSignedIn = jest.fn();
    const user = userEvent.setup();
    await renderWithProviders(<LoginForm onSignedIn={onSignedIn} />);

    await fillCredentials(user, "alice", "wrong");
    await user.press(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tên đăng nhập hoặc mật khẩu không đúng.",
    );
    expect(onSignedIn).not.toHaveBeenCalled();
    // The user can correct the password and try again straight away.
    expect(submitButton()).toBeEnabled();
  });

  it("the login error is spoken when it appears (iOS has no live regions)", async () => {
    signInMock.mockRejectedValue(new ApiError(401, "UNAUTHORIZED", "Bad credentials"));
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => undefined);
    announce.mockClear();
    const user = userEvent.setup();
    await renderWithProviders(<LoginForm onSignedIn={jest.fn()} />);

    await fillCredentials(user, "alice", "wrong");
    await user.press(submitButton());

    await waitFor(() =>
      expect(announce).toHaveBeenCalledWith("Tên đăng nhập hoặc mật khẩu không đúng."),
    );
    announce.mockRestore();
  });

  it("a failure after signing in is not shown as a login failure", async () => {
    // R37a: the session is established; a throw in what follows (navigation) is not a wrong
    // password, so it must not come back as login copy.
    const failure = new Error("navigation failed");
    const onSignedIn = jest.fn(() => {
      throw failure;
    });
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    await renderWithProviders(<LoginForm onSignedIn={onSignedIn} />);
    await fillCredentials(user, "alice", "s3cret");

    await user.press(submitButton());

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).toBeNull();
    // Reported as the programming error it is, not swallowed.
    await waitFor(() => expect(consoleError).toHaveBeenCalledWith(expect.any(String), failure));
    consoleError.mockRestore();
  });

  it("rate limited disables submit with countdown", async () => {
    jest.useFakeTimers();
    const rateLimited = new ApiError(429, "RATE_LIMITED", "Too many requests");
    rememberRetryAfter(rateLimited, "30");
    signInMock.mockRejectedValue(rateLimited);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderWithProviders(<LoginForm onSignedIn={jest.fn()} />);

    await fillCredentials(user, "alice", "s3cret");
    await user.press(submitButton());

    const locked = await screen.findByRole("button", { name: "Thử lại sau 30 giây" });
    expect(locked).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.",
    );

    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });
    expect(screen.getByRole("button", { name: "Thử lại sau 29 giây" })).toBeDisabled();

    await act(async () => {
      jest.advanceTimersByTime(29_000);
    });
    expect(submitButton()).toBeEnabled();
  });
});

describe("PasswordField", () => {
  it("keeps the eye button beside the field when an error shows under it", async () => {
    await render(<PasswordField error="Bắt buộc nhập" />);

    const field = screen.getByLabelText(MOBILE_LABELS.login.password);
    const eye = screen.getByRole("togglebutton", { name: MOBILE_LABELS.login.showPassword });
    expect(eye.parent).toBe(field.parent);
    expect(screen.getByRole("alert")).toHaveTextContent("Bắt buộc nhập");
  });
});

describe("AuthGate", () => {
  const branches = (status: "authenticated" | "unauthenticated") =>
    status === "authenticated" ? <Text>app</Text> : <LoginForm onSignedIn={jest.fn()} />;

  it("bootstrap failure shows retry not login", async () => {
    useAuthStore.setState({ status: "unknown", bootstrapError: AUTH_UI.bootstrapError });
    const user = userEvent.setup();
    await renderWithProviders(<AuthGate>{branches}</AuthGate>);
    bootstrapMock.mockClear();

    expect(screen.getByText(AUTH_UI.bootstrapError)).toBeOnTheScreen();
    expect(screen.queryByLabelText(MOBILE_LABELS.login.username)).toBeNull();
    expect(screen.queryByText("app")).toBeNull();

    await user.press(screen.getByRole("button", { name: AUTH_UI.retry }));

    expect(bootstrapMock).toHaveBeenCalledTimes(1);
  });

  it("shows the verifying screen while the session is checked", async () => {
    await renderWithProviders(<AuthGate>{branches}</AuthGate>);

    expect(screen.getByText(AUTH_UI.verifyingSession)).toBeOnTheScreen();
    expect(screen.queryByLabelText(MOBILE_LABELS.login.username)).toBeNull();
    expect(bootstrapMock).toHaveBeenCalledTimes(1);
  });

  it("renders the branch for the known status", async () => {
    await renderWithProviders(<AuthGate>{branches}</AuthGate>);

    await act(async () => useAuthStore.getState().logout());
    expect(screen.getByLabelText(MOBILE_LABELS.login.username)).toBeOnTheScreen();

    await act(async () => useAuthStore.getState().login(ALICE, Date.now() + MINUTE_MS * 60));
    expect(screen.getByText("app")).toBeOnTheScreen();
  });
});

describe("ReloginSheet", () => {
  it("ReloginSheet overlays without unmounting children", async () => {
    const user = userEvent.setup();
    await renderWithProviders(
      <ReloginSheet>
        <DraftScreen />
      </ReloginSheet>,
      { user: ALICE },
    );
    await user.type(screen.getByLabelText("Ghi chú"), "draft");
    expect(screen.queryByText(MOBILE_LABELS.relogin.title)).toBeNull();

    await act(async () => useAuthStore.getState().markSessionExpired());

    expect(screen.getByText(MOBILE_LABELS.relogin.title)).toBeOnTheScreen();
    expect(screen.getByText(MOBILE_LABELS.relogin.description)).toBeOnTheScreen();
    // Still mounted under the sheet, which keeps screen readers off it while open.
    expect(screen.queryByLabelText("Ghi chú")).toBeNull();
    expect(screen.getByLabelText("Ghi chú", { includeHiddenElements: true })).toHaveProp(
      "value",
      "draft",
    );
  });

  it("cannot be swiped away while the session is expired", async () => {
    await renderWithProviders(<ReloginSheet>{null}</ReloginSheet>, { user: ALICE });
    await act(async () => useAuthStore.getState().markSessionExpired());

    await __userDismissSheets();

    expect(screen.getByText(MOBILE_LABELS.relogin.title)).toBeOnTheScreen();
  });

  it("relogin as the same user closes the sheet and keeps the screen", async () => {
    reauthenticateMock.mockImplementation(async () => {
      useAuthStore.getState().renewSession(ALICE, Date.now() + MINUTE_MS * 480);
      return "same-user";
    });
    const user = userEvent.setup();
    const { queryClient } = await renderWithProviders(
      <ReloginSheet>
        <DraftScreen />
      </ReloginSheet>,
      { user: ALICE },
    );
    await user.type(screen.getByLabelText("Ghi chú"), "draft");
    await act(async () => useAuthStore.getState().markSessionExpired());

    await fillCredentials(user, " alice ", "s3cret");
    await user.press(submitButton());

    expect(reauthenticateMock).toHaveBeenCalledWith(
      { username: "alice", password: "s3cret" },
      queryClient,
    );
    await waitFor(() => expect(screen.queryByText(MOBILE_LABELS.relogin.title)).toBeNull());
    expect(screen.getByLabelText("Ghi chú")).toHaveProp("value", "draft");
  });

  // Switching users (navigation reset to the start route) is tested on the real routes, in
  // app-shell.test.tsx: "relogin as another user navigates to first hub".

  it("opens on the clock without the expiry banner", async () => {
    // R36: the sheet owns clock expiry; it does not rely on the banner being mounted.
    jest.useFakeTimers();
    await renderWithProviders(
      <ReloginSheet>
        <Text>screen</Text>
      </ReloginSheet>,
      { user: ALICE },
    );
    await act(async () => useAuthStore.getState().login(ALICE, Date.now() + MINUTE_MS));
    expect(screen.queryByText(MOBILE_LABELS.relogin.title)).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(MINUTE_MS + 30_000);
    });

    expect(screen.getByText(MOBILE_LABELS.relogin.title)).toBeOnTheScreen();
    // Still mounted under the sheet (hidden from screen readers while it is open).
    expect(screen.getByText("screen", { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it("locks submit and sign out while a re-login is pending", async () => {
    // R21: signing out under a pending re-login could let the re-login revive the session.
    const pending = deferred<"same-user">();
    reauthenticateMock.mockReturnValue(pending.promise);
    const user = userEvent.setup();
    await renderWithProviders(<ReloginSheet>{null}</ReloginSheet>, { user: ALICE });
    await act(async () => useAuthStore.getState().markSessionExpired());

    await fillCredentials(user, "alice", "s3cret");
    await user.press(submitButton());

    await waitFor(() => expect(signOutButton()).toBeDisabled());
    expect(submitButton()).toBeDisabled();
    await user.press(signOutButton());
    expect(signOutMock).not.toHaveBeenCalled();

    await act(async () => pending.resolve("same-user"));
    expect(signOutButton()).toBeEnabled();
  });

  it("signs out from the sheet", async () => {
    const user = userEvent.setup();
    const { queryClient } = await renderWithProviders(<ReloginSheet>{null}</ReloginSheet>, {
      user: ALICE,
    });
    await act(async () => useAuthStore.getState().markSessionExpired());

    await user.press(signOutButton());

    expect(signOutMock).toHaveBeenCalledWith(queryClient);
  });

  it("opens on request before expiry and can then be swiped away", async () => {
    const onRequestHandled = jest.fn();
    await renderWithProviders(
      <ReloginSheet requested onRequestHandled={onRequestHandled}>
        {null}
      </ReloginSheet>,
      { user: ALICE },
    );

    // Not expired yet, so the sheet does not say it is.
    expect(screen.getByText(MOBILE_LABELS.sessionExpiry.action)).toBeOnTheScreen();
    expect(screen.queryByText(MOBILE_LABELS.relogin.title)).toBeNull();

    await __userDismissSheets();

    expect(onRequestHandled).toHaveBeenCalledTimes(1);
  });
});

describe("SessionExpiryBanner", () => {
  it("expiry banner shows remaining minutes", async () => {
    const onRelogin = jest.fn();
    const user = userEvent.setup();
    await renderWithProviders(
      <SessionExpiryBanner onRelogin={onRelogin}>
        <Text>screen</Text>
      </SessionExpiryBanner>,
      { user: ALICE },
    );
    await act(async () => useAuthStore.getState().login(ALICE, Date.now() + 10 * MINUTE_MS));

    expect(
      screen.getByText("Phiên sắp hết hạn (còn 10 phút) — đăng nhập lại để không gián đoạn"),
    ).toBeOnTheScreen();
    expect(screen.getByText("screen")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.sessionExpiry.action }));

    expect(onRelogin).toHaveBeenCalledTimes(1);
  });

  it("announces the warning once, not at every minute", async () => {
    // R37c: the text updates every minute; a screen reader hears it only when it first shows.
    jest.useFakeTimers();
    // React Native's Jest setup already makes this a jest.fn shared by every test: start from zero.
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => undefined);
    announce.mockClear();
    await renderWithProviders(
      <SessionExpiryBanner onRelogin={jest.fn()}>
        <Text>screen</Text>
      </SessionExpiryBanner>,
      { user: ALICE },
    );

    await act(async () => useAuthStore.getState().login(ALICE, Date.now() + 10 * MINUTE_MS));
    await act(async () => {
      jest.advanceTimersByTime(MINUTE_MS);
    });
    expect(screen.getByText(MOBILE_LABELS.sessionExpiry.warning(9))).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(MINUTE_MS);
    });

    expect(screen.getByText(MOBILE_LABELS.sessionExpiry.warning(8))).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(MOBILE_LABELS.sessionExpiry.warning(10));
    announce.mockRestore();
  });

  it("counts down in whole minutes and never shows less than one", async () => {
    await renderWithProviders(
      <SessionExpiryBanner onRelogin={jest.fn()}>
        <Text>screen</Text>
      </SessionExpiryBanner>,
      { user: ALICE },
    );

    await act(async () => useAuthStore.getState().login(ALICE, Date.now() + 30_000));

    expect(screen.getByText(MOBILE_LABELS.sessionExpiry.warning(1))).toBeOnTheScreen();
  });

  it("takes the status bar inset so the screen below does not pad for it again", async () => {
    function InsetProbe() {
      return <Text>{`top ${useSafeAreaInsets().top}`}</Text>;
    }
    await renderWithProviders(
      <SafeAreaProvider initialMetrics={WINDOW_METRICS}>
        <SessionExpiryBanner onRelogin={jest.fn()}>
          <InsetProbe />
        </SessionExpiryBanner>
      </SafeAreaProvider>,
      { user: ALICE },
    );
    expect(screen.getByText("top 47")).toBeOnTheScreen();

    await act(async () => useAuthStore.getState().login(ALICE, Date.now() + 5 * MINUTE_MS));

    expect(screen.getByText("top 0")).toBeOnTheScreen();
  });

  it("stays hidden while the session has longer than the warning window left", async () => {
    await renderWithProviders(
      <SessionExpiryBanner onRelogin={jest.fn()}>
        <Text>screen</Text>
      </SessionExpiryBanner>,
      { user: ALICE },
    );

    expect(screen.getByText("screen")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: MOBILE_LABELS.sessionExpiry.action })).toBeNull();
  });

  it("keeps the screen mounted when the banner appears", async () => {
    const user = userEvent.setup();
    await renderWithProviders(
      <SessionExpiryBanner onRelogin={jest.fn()}>
        <DraftScreen />
      </SessionExpiryBanner>,
      { user: ALICE },
    );
    await user.type(screen.getByLabelText("Ghi chú"), "draft");

    await act(async () => useAuthStore.getState().login(ALICE, Date.now() + 5 * MINUTE_MS));

    expect(
      screen.getByRole("button", { name: MOBILE_LABELS.sessionExpiry.action }),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText("Ghi chú")).toHaveProp("value", "draft");
  });
});
