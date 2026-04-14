use std::env;
use std::process::Command;

fn git_output(manifest_dir: &str, args: &[&str]) -> Option<String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(manifest_dir)
        .args(args)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let value = String::from_utf8(output.stdout).ok()?;
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn resolve_build_display_version(manifest_dir: &str, package_version: &str) -> String {
    git_output(
        manifest_dir,
        &[
            "describe",
            "--tags",
            "--exact-match",
            "--match",
            "v*",
            "HEAD",
        ],
    )
    .or_else(|| git_output(manifest_dir, &["rev-parse", "--short=7", "HEAD"]))
    .unwrap_or_else(|| format!("v{}", package_version))
}

fn main() {
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".to_string());
    let package_version = env::var("CARGO_PKG_VERSION").unwrap_or_else(|_| "0.0.0".to_string());
    let display_version = resolve_build_display_version(&manifest_dir, &package_version);

    println!("cargo:rustc-env=SOP_TO_SKILL_BUILD_DISPLAY_VERSION={display_version}");

    tauri_build::build()
}
